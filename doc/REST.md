# 1. REST API Guidelines and Usage

REST is effectively a remote procedure call over an HTTP interface. With HTTP
there are components people are familiar with using a Web Browser (URL, content)
but others that they may not be. 

[1]: https://github.com/Microsoft/api-guidelines/blob/vNext/Guidelines.md

A very thorough overview of good REST API design is located on Microsoft's 
[git hub][1]

## 2. Summary Guidance

### 2.1 Response/Request Objects

The usage of JSON should be used to provided formatted objects between clients
and endpoints. XML should be avoided. 

### 2.2 Valid Operations

The following table from [(1)][1] shows us valid operations to an endpoint
or a URL: 

	| Method  | Description                                                                                                                | Is Idempotent |
	| ------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
	| GET     | Return the current value of an object                                                                                      | True          |
	| PUT     | Replace an object, or create a named object, when applicable                                                               | True          |
	| DELETE  | Delete an object                                                                                                           | True          |
	| POST    | Create a new object based on the data provided, or submit a command                                                        | False         |
	| HEAD    | Return metadata of an object for a GET response. Resources that support the GET method MAY support the HEAD method as well | True          |
	| PATCH   | Apply a partial update to an object                                                                                        | False         |
	| OPTIONS | Get information about a request; see below for details.                                                                    | True          |

### 2.3 Endpoint naming + Expected behavior

URL names should be human readable to maximimize there effectiveness. 

#### 2.3.1 Lists + New Items
`/rest/EntityMedias` is an intuitive REST API name. It is intuitive to imagine
a GET request to that URL would return a list of all EntityMedia elements in 
the system.

*query* arguments are those that provide minimization to a given list. An 
example might be:

`/rest/EntityMedias?name=MVI_0308.mp4` which returns a list of all 
EntityMedia elements that have a name of `MVI_0308.mp4`.

Usually List endpoints can either be read-only (supporting only `GET`) or
read-write (supporting both `GET` and `POST`). A `POST` request would be
used to add a new object into the database. 

At a minimum a list should return the primary key of an element such that its
[detail view](#232-detail-views-patching-deleting) could be retrived. A technique that can make usage easier
is to provide a URL to the detail view of a given object. 

#### 2.3.2 Detail views / Patching / Deleting

`/rest/ObjectType/<int:pk>` is a standard API for a _detail_ view of a
given object. The Django Rest Framework has a default base class handler that
for exposes a ModelObject to `DELETE`, `PUT`, `PATCH`, or `GET`.  





