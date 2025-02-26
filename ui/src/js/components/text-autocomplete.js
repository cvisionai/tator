import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import autocomplete from "../../../node_modules/autocompleter/autocomplete.mjs";

export class WormsAutoComplete {
  /// Construct a WormsAutocomplete handler based on
  /// a minimum rank. See
  /// https://www.marinespecies.org/rest/AphiaTaxonRanksByID/-1?AphiaID=2
  /// for the levels (hint: 220 is species)
  constructor(minimumRank, useCommon) {
    this.compute_heirarchy();
    this._minLevel = minimumRank;
    this._useCommon = useCommon;
  }

  // Compute level heirarchy, for now only support Animalia kingdom
  compute_heirarchy() {
    this._WORMS_HEIRARCHY = {};
    const animalia_ranks_url =
      "https://www.marinespecies.org/rest/AphiaTaxonRanksByID/-1?AphiaID=2";
    fetch(new Request(animalia_ranks_url))
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        let count = 0;
        for (let rank of json) {
          let name = rank["taxonRank"].toLowerCase();
          this._WORMS_HEIRARCHY[name] = { rankId: rank["taxonRankID"] };
          if (count > 0) {
            this._WORMS_HEIRARCHY[name]["parent"] =
              json[count - 1]["taxonRank"].toLowerCase();
          } else {
            this._WORMS_HEIRARCHY[name]["parent"] = null;
          }
          count += 1;
        }
      });
  }

  /// Filters out matches based on configuration options.
  /// View worms_fetch for more information about configuration options.
  createFilteredMatches(scientific_matches, only_accepted, ignore_extinct) {
    var filtered_matches = [];
    for (const match of scientific_matches) {
      if (only_accepted && match["status"] != "accepted") {
        continue;
      }
      if (ignore_extinct && match["isExtinct"] == 1) {
        continue;
      }
      filtered_matches.push(match);
    }
    return filtered_matches;
  }

  /// Implementation to process results from WoRMs marine database.
  /// This routine calls the autocomplete callback with a list of formatted
  /// suggestions per the API requirements (https://github.com/kraaden/autocomplete)
  ///
  /// Configuration options:
  /// marine_only = 0/1 (default 0)
  /// ignore_extinct = 0/1 (default 0, 1 ignores extinct species)
  /// only_accepted = 0/1 (default 0, 1 only returns accepted species)
  /// max_name_results = 50 (default 50, maximum number of name results to fetch
  ///
  /// Note: These options may not be in the configuration. Will default.
  ///       Also may be ignored if the configuration value is incorrect.
  worms_fetch(config, text, callback) {
    text = text.trim();
    if (text == "") {
      callback([]);
      return false;
    }

    var marine_only_param_str = "marine_only=false";
    if (config?.marine_only == 1) {
      marine_only_param_str = "marine_only=true";
    }

    var ignore_extinct = false;
    if (config?.ignore_extinct == 1) {
      ignore_extinct = true;
    }

    var only_accepted = false;
    if (config?.only_accepted == 1) {
      only_accepted = true;
    }

    // Note: The maximum number of results returned is 50 for the name and vernacular endpoints.
    //       Thus we will need to paginate if we want more than 50 results. Determine the number
    //       of fetches we need here.
    const max_worms_results_per_fetch = 50;
    var max_name_results = max_worms_results_per_fetch;
    if (config?.max_name_results) {
      max_name_results = config.max_name_results;
    }
    var num_fetches = Math.ceil(max_name_results / max_worms_results_per_fetch);

    const worms_service_url = "https://www.marinespecies.org/rest";
    if (this._useCommon == false) {
      let name_url = worms_service_url;
      name_url += "/AphiaRecordsByName/";
      name_url += text;
      name_url += "?like=true";
      name_url += "&";
      name_url += marine_only_param_str;

      var requests = [];
      for (let i = 0; i < num_fetches; i++) {
        let offset = 1 + i * max_worms_results_per_fetch;
        let current_url = name_url + "&offset=" + offset;
        let name_request = new Request(current_url);
        requests.push(fetch(name_request));
      }

      Promise.all(requests).then((nameResponses) => {
        // Check responses for 200. 200 indicates a result was returned
        // 204 indicates no results were returned.
        var jsonResults = [];
        for (let response of nameResponses) {
          if (response.status == 200) {
            jsonResults.push(response.json());
          }
        }

        // If no results were returned, call the callback with an empty list
        if (jsonResults.length == 0) {
          document.body.style.cursor = null;
          this._input_element.style.cursor = null;
          callback([]);
          return false;
        }

        // Process all the results
        Promise.all(jsonResults).then((nameMatches) => {
          var filtered_matches = this.createFilteredMatches(
            nameMatches.flat(),
            only_accepted,
            ignore_extinct
          );
          this.finalize_worms_result(text, callback, filtered_matches, []);
          return true;
        });
      });
    } else {
      let vernacular_url = worms_service_url;
      vernacular_url += "/AphiaRecordsByVernacular/";
      vernacular_url += text;
      vernacular_url += "?like=true";
      let vernacular_request = new Request(vernacular_url);

      let vernacular_detail_url = worms_service_url;
      vernacular_detail_url += "/AphiaVernacularsByAphiaID/";
      let vernacular_promise = fetch(vernacular_request);

      let name_url = worms_service_url;
      name_url += "/AphiaRecordsByName/";
      name_url += text;
      name_url += "?like=true";
      name_url += "&";
      name_url += marine_only_param_str;

      var nameRequests = [];
      for (let i = 0; i < num_fetches; i++) {
        let offset = 1 + i * max_worms_results_per_fetch;
        let current_url = name_url + "&offset=" + offset;
        let name_request = new Request(current_url);
        nameRequests.push(fetch(name_request));
      }

      Promise.all(nameRequests).then((nameResponses) => {
        // Check responses for 200. 200 indicates a result was returned
        // 204 indicates no results were returned.
        var nameJsonResults = [];
        for (let response of nameResponses) {
          if (response.status == 200) {
            nameJsonResults.push(response.json());
          }
        }

        vernacular_promise.then((initialVernacularResponse) => {
          if (initialVernacularResponse.status == 204) {
            // No vernaculars found, check the scientific names
            if (nameJsonResults.length == 0) {
              // Got no results from both endpoints.
              document.body.style.cursor = null;
              this._input_element.style.cursor = null;
              callback([]);
              return false;
            }

            // Got no vernaculars, but we have at least one scientific name match
            Promise.all(nameJsonResults).then((nameMatches) => {
              var filtered_matches = this.createFilteredMatches(
                nameMatches.flat(),
                only_accepted,
                ignore_extinct
              );
              this.finalize_worms_result(text, callback, filtered_matches, []);
              return true;
            });
          } else {
            // We at least have vernaculars. Send out corresponding fetches.
            initialVernacularResponse.json().then((initialVernacularResult) => {
              let secondVernacularRequests = [];
              let vernacular_matches = [];

              let common_matches = 0;
              // Process the JSON of the vernacular response to build a match list
              for (const aphiaRecord of initialVernacularResult) {
                if (only_accepted && aphiaRecord?.["status"] != "accepted") {
                  continue;
                }
                if (ignore_extinct && aphiaRecord?.["isExtinct"] == 1) {
                  continue;
                }

                if (aphiaRecord["taxonRankID"] >= this._minLevel) {
                  vernacular_matches.push(aphiaRecord);
                  secondVernacularRequests.push(
                    fetch(
                      new Request(
                        vernacular_detail_url + aphiaRecord["AphiaID"]
                      )
                    )
                  );
                  common_matches += 1;
                }

                // Limit common matches to 5 for performance
                // reasons.
                if (common_matches >= 5) {
                  break;
                }
              }

              Promise.all(secondVernacularRequests).then(
                (secondVernacularResponses) => {
                  let json_promises = [];
                  let count = 0;
                  for (const response of secondVernacularResponses) {
                    if (response.status == 200) {
                      json_promises.push(response.json());
                    } else {
                      // If we get a 204 back for vernaculars we need to specify there are
                      // no vernaculars
                      json_promises.push(
                        new Promise((resolve) => {
                          resolve(null);
                        })
                      );
                    }
                  }

                  Promise.all(json_promises).then((each_result) => {
                    for (const response of each_result) {
                      // Augment each aphia record with the list of vernaculars
                      if (only_accepted && response?.["status"] != "accepted") {
                        continue;
                      }
                      if (ignore_extinct && response?.["isExtinct"] == 1) {
                        continue;
                      }

                      vernacular_matches[count]["vernaculars"] = response;
                      count += 1;
                    }

                    if (nameJsonResults.length == 0) {
                      // We have no scientific name matches, process only vernacular matches
                      this.finalize_worms_result(
                        text,
                        callback,
                        [],
                        vernacular_matches
                      );
                    } else {
                      // We have scientific name matches, process both scientific and vernacular matches
                      Promise.all(nameJsonResults).then((nameMatches) => {
                        var filtered_matches = this.createFilteredMatches(
                          nameMatches.flat(),
                          only_accepted,
                          ignore_extinct
                        );
                        this.finalize_worms_result(
                          text,
                          callback,
                          filtered_matches,
                          vernacular_matches
                        );
                      });
                    }
                  });
                }
              );
            });
          }
        });
      });
    }
    return true;
  }

  compute_parent(aphiaRecord) {
    const rank = aphiaRecord["rank"].toLowerCase();
    let parent = this._WORMS_HEIRARCHY[rank]["parent"];
    while (parent in this._WORMS_HEIRARCHY) {
      if (parent in aphiaRecord) {
        return aphiaRecord[parent];
      } else {
        parent = this._WORMS_HEIRARCHY[parent]["parent"];
      }
    }
    console.error("Could not determine parent for " + aphiaRecord);
    return "WoRMS Record";
  }

  // Given an extended aphia record; compute the most likely
  // vernacular match
  static compute_alias(text, aphiaRecord) {
    if ("vernaculars" in aphiaRecord == false) {
      return null;
    }

    // Each species has common name by language and
    // there may be dupes
    let commonNames = [];
    for (let common of aphiaRecord["vernaculars"]) {
      if (common["language_code"] == "eng") {
        commonNames.push({
          name: common["vernacular"],
          score: TatorAutoComplete.levenshtein_distance(
            text,
            common["vernacular"]
          ),
        });
      }
    }

    if (commonNames.length > 0) {
      commonNames.sort((a, b) => {
        return a["score"] - b["score"];
      });
      return commonNames[0]["name"];
    } else {
      return null;
    }
  }

  finalize_worms_result(
    text,
    callback,
    scientificName_matches,
    vernacular_matches
  ) {
    /// First merge the two match sets

    let preresults = new Map();
    for (let result of vernacular_matches) {
      if (
        result["taxonRankID"] >= this._minLevel &&
        result["status"] == "accepted"
      ) {
        preresults.set(result["AphiaID"], result);
      }
    }

    for (let result of scientificName_matches) {
      if (result["taxonRankID"] >= this._minLevel) {
        if (
          preresults.has(result["AphiaID"]) == false &&
          result["status"] == "accepted"
        ) {
          preresults.set(result["AphiaID"], result);
        }
      }
    }

    // Prereslts now contain all the matching AphiaRecords that WoRms settled on
    // based on querying the common names (vernaculars) and scientific names

    // Iterate over each Aphia record and convert to
    // {"value" : ...,
    //  "group": ...,
    //  "data" : {} or {"alias": ...}
    // }
    let suggestions = [];

    // result is a tuple (AphiaID, obj)
    for (let result of preresults) {
      let obj = {};
      obj["value"] = result[1]["scientificname"];
      obj["group"] = this.compute_parent(result[1]);
      obj["data"] = {};
      let alias = WormsAutoComplete.compute_alias(text, result[1]);
      if (alias) {
        obj["data"]["alias"] = alias;
      }
      suggestions.push(obj);
    }
    callback(suggestions);

    if (suggestions.length == 0) {
      document.body.style.cursor = null;
      this._input_element.style.cursor = null;
    }
  }
}

/// Class to setup autocomplete on an input element
export class TatorAutoComplete {
  /// Compute the lavenshetin distance of two strings
  static levenshtein_distance(a, b) {
    if (a.length == 0) return b.length;
    if (b.length == 0) return a.length;

    var matrix = [];

    // increment along the first column of each row
    var i;
    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // increment each column in the first row
    var j;
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1
            )
          ); // deletion
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /// Implementation to process results from built-in Tator Suggestion Service
  static tator_fetch(config, text, callback) {
    if (text == "") {
      return false;
    }

    var extraParams = new Map();
    if (config.params) {
      Object.keys(config.params).forEach((key) => {
        extraParams.set(
          key,
          Object.getOwnPropertyDescriptor(config.params, key).value
        );
      });
    }

    // If config has match_any enabled, prepend a wildcard.
    let query;
    if (config.match_any) {
      query = `*${text}*`;
    } else {
      query = text;
    }

    // Build up URL
    var url = `${config.serviceUrl}?query=${query}`;
    extraParams.forEach((value, key) => {
      url += `&${key}=${value}`;
    });
    fetchCredentials(url)
      .then((response) => {
        return response.json();
      })
      .then(callback);
    return true;
  }

  static enable(input_element, config) {
    if (
      config == null ||
      (!config.hasOwnProperty("serviceUrl") && config.mode != "worms")
    ) {
      return;
    }

    var minChars = 3;
    if (config.minChars) {
      minChars = config.minChars;
    }
    var mode = "tator";
    if (config.mode) {
      mode = config.mode;
    }

    let fetch_method = TatorAutoComplete.tator_fetch;
    if (mode == "worms") {
      let minLevel = 180;
      if (config.minLevel) {
        minLevel = config.minLevel;
      }
      let useCommon = true;
      if (config.useCommon != undefined) {
        useCommon = config.useCommon;
      }

      // Initialize new handler
      let worms = new WormsAutoComplete(minLevel, useCommon);
      fetch_method = worms.worms_fetch.bind(worms);
      worms._input_element = input_element;

      // Set min chars to 5 to not slam WORMS
      minChars = 5;
    }

    autocomplete({
      input: input_element,
      minLength: minChars,
      debounceWaitMs: 250,
      onSelect(item) {
        if (input_element.classList.contains("disabled")) {
          return;
        }
        input_element.value = item.value;
        input_element.dispatchEvent(new Event("change"));
        input_element.blur();
      },
      render: (item, currentValue) => {
        var pattern = new RegExp(currentValue, "gi");
        var highlightedValue = item.value.replace(
          pattern,
          `<strong class="match">$&</strong>`
        );
        var text = highlightedValue;
        if ("alias" in item.data && item.data.alias != null) {
          var highlightedAlias = item.data.alias.replace(
            pattern,
            `<strong class="match">${currentValue}</strong>`
          );

          text = highlightedValue + " (" + highlightedAlias + ")";
        }
        var div = document.createElement("div");
        div.innerHTML = text;
        document.body.style.cursor = "default";
        input_element.style.cursor = "auto";
        return div;
      },
      fetch: (text, callback) => {
        if (input_element.classList.contains("disabled")) {
          return;
        }
        input_element.style.cursor = "progress";
        document.body.style.cursor = "progress";
        if (fetch_method(config, text, callback) == false) {
          input_element.style.cursor = "auto";
          document.body.style.cursor = "default";
        }
      },
      // Show suggestions on focus of element (i.e. click)
      showOnFocus: true,
    });
  }
}
