class TatorAutoComplete {
  static enable(input_element, config)
  {
    if (config == null || ! 'serviceUrl' in config) {
      return;
    }

    var minChars=3;
    if (config.minChars)
    {
      minChars = config.minChars;
    }
    var mode="tator";
    if (config.mode)
    {
      mode = config.mode;
    }
    var extraParams=new Map();
    if (config.params)
    {
      Object.keys(config.params).forEach(key => {
        extraParams.set(key, Object.getOwnPropertyDescriptor(config.params,
                                                             key).value);
      });
    }

    let tator_style_fetch = (text,callback) => {
      if (text == "")
      {
        return;
      }
      document.body.style.cursor="progress";
      // Build up URL
      var url=`${config.serviceUrl}?query=${text}`;
      extraParams.forEach((value, key) =>
                          {
                            url += `&${key}=${value}`
                          });
      fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
        .then(response => {
          document.body.style.cursor="default";
          return response.json()
        })
        .then(callback)
    }

    let worms_fetch = (text,callback) => {
      console.warn("Not implemented!");
    }

    let fetch_method = tator_style_fetch;
    if (mode == "worms")
    {
      fetch_method = worms_fetch;
    }
    
    autocomplete(
      {
        input: input_element,
        minLength: minChars,
        onSelect(item)
        {
          input_element.value = item.value;
          input_element.dispatchEvent(new Event("change"));
          input_element.blur();
        },
        render: (item, currentValue) =>
          {
            var pattern = new RegExp(currentValue,'gi');
	          var highlightedValue = item.value.replace(
              pattern,
						  `<strong class="match">$&</strong>`);
	          var text = highlightedValue;
	          if ('alias' in item.data && item.data.alias != null)
	          {
	            var highlightedAlias = item.data.alias.replace(
                pattern,
								`<strong class="match">${currentValue}</strong>`);

	            text=highlightedValue+ " (" + highlightedAlias + ")"
	          }
            var div = document.createElement("div");
            div.innerHTML = text;
            return div;
          },
        fetch: fetch_method,
        // Show suggestions on focus of element (i.e. click)
        showOnFocus: true
      });
  }
}
