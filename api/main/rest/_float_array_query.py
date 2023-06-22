import math
import logging

logger = logging.getLogger(__name__)


def get_float_array_query(params, query):
    float_array_queries = params.get("float_array")  # PUT request only
    if float_array_queries is not None:
        script = ""
        return_statement = "return "
        for idx, float_array_query in enumerate(float_array_queries):
            name = float_array_query["name"]
            center = float_array_query["center"]
            metric = float_array_query.get("metric", "l2norm")
            lower_bound = float_array_query.get("lower_bound")
            upper_bound = float_array_query.get("upper_bound")
            order = float_array_query.get("order", "asc")
            if metric == "l2norm":
                script += f"double val{idx} = 1.0 + l2norm(params.query_vector, doc['{name}']); "
                if lower_bound:
                    script += f"val{idx} = val{idx} > {1.0 + lower_bound} ? val{idx} : 0; "
                if upper_bound:
                    script += f"val{idx} = val{idx} < {1.0 + upper_bound} ? val{idx} : 0; "
            elif metric == "l1norm":
                script += f"double val{idx} = 1.0 + l1norm(params.query_vector, doc['{name}']); "
                if lower_bound:
                    script += f"val{idx} = val{idx} < {1.0 + lower_bound} ? val{idx} : 0; "
                if upper_bound:
                    script += f"val{idx} = val{idx} > {1.0 + upper_bound} ? val{idx} : 0; "
            elif metric == "cosine_similarity":
                script += f"double val{idx} = cosineSimilarity(params.query_vector, doc['{name}']) + 1.0; "
                if lower_bound:
                    script += f"val{idx} = val{idx} > {1 + lower_bound} ? val{idx} : 0; "
                if upper_bound:
                    script += f"val{idx} = val{idx} < {1 + upper_bound} ? val{idx} : 0; "
            elif metric == "dot_product":
                script += (
                    f"double val{idx} = dotProduct(params.query_vector, doc['{name}']); "
                    f"val{idx} = sigmoid(1, math.E, -val{idx}); "
                )
                if lower_bound:
                    script += (
                        f"val{idx} = val{idx} > {1 / (1 + math.exp(-lower_bound))} ? val{idx} : 0; "
                    )
                if upper_bound:
                    script += (
                        f"val{idx} = val{idx} < {1 / (1 + math.exp(-upper_bound))} ? val{idx} : 0; "
                    )
        script += (
            "return " + " + ".join([f"val{idx}" for idx in range(len(float_array_queries))]) + ";"
        )
        query["query"] = {
            "script_score": {
                "query": query["query"],
                "min_score": 0.000001,
                "script": {"source": script, "params": {"query_vector": center}},
            }
        }
        # Sort by script score rather than what was used in the query.
        query["sort"] = {"_score": order}
    return query
