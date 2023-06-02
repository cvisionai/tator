[![logo](https://github.com/cvisionai/tator/raw/main/ui/server/static/images/tator-logo.png)](https://www.tator.io)
[![cvisionai](https://circleci.com/gh/cvisionai/tator.svg?style=shield)](https://circleci.com/gh/cvisionai/tator)
[![CodeQL](https://github.com/cvisionai/tator/actions/workflows/codeql.yml/badge.svg)](https://github.com/cvisionai/tator/actions/workflows/codeql.yml)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

What is Tator?
==============

**Tator** is a web platform for analyzing large video and image datasets. Tator lets you rapidly deploy custom analytics workflows to gain insights from your raw imagery. Tator runs on bare metal and all major cloud providers, and is open source under GNU AGPLv3.

* **Digital asset management** - Host, share, stream, and organize all your digital assets through a browser interface.
* **Data management** - Define custom structured metadata and know its provenance.
* **Extract, transform, load** - Support ETL workflows with instant frame-accurate image and clip extraction.
* **Video and image annotation** - Annotate media, frames, objects, tracks, and activities. QA/QC with built-in review tools.
* **Simplified MLOps** - AI-assisted annotation and scalable batch inference with one click.
* **Visual analytics** - Aggregate, visualize, and report the information you need.

Visit https://tator.io to learn more.

Quick start
===========

Install [Docker](https://www.docker.com/), then:

```bash
git clone --recurse-submodules https://github.com/cvisionai/tator
cd tator
make tator
make superuser
```

Enter desired superuser credentials, then open your browser on the same node to `http://localhost:8080`.

Documentation
=============

* [Introduction to Tator](https://tator.io/docs/introduction-to-tator)
* [User guide](https://tator.io/docs/user-guide)
* [Developer guide](https://tator.io/docs/developer-guide)
* [Administrator guide](https://tator.io/docs/administrator-guide)
* [References](https://tator.io/docs/references)

Blog
====

Visit [our blog](https://www.tator.io/blog/) for upcoming features, development roadmap, news and announcements.

Tator Enterprise
================

This repository has everything you need to run Tator on a single node. [Tator Enterprise](https://tator.io/product) can run on many nodes, autoscales with Kubernetes and Argo, integrates with third-party authentication, and more. Technical support is included with a Tator Enterprise subscription.

Screenshots
===========

![project-detail-view](https://user-images.githubusercontent.com/7937658/114918093-afaf1480-9df4-11eb-8968-5edb963029a0.PNG)

![annotation-view](https://user-images.githubusercontent.com/7937658/114918098-b178d800-9df4-11eb-8845-d982bed5e67d.PNG)

![analytics-view](https://user-images.githubusercontent.com/7937658/114918096-b0e04180-9df4-11eb-8188-9d68f0ef42f1.PNG)

