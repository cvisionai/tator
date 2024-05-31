[![logo](https://github.com/cvisionai/tator/raw/main/ui/server/static/images/tator-logo.png)](https://www.tator.io)
[![cvisionai](https://circleci.com/gh/cvisionai/tator.svg?style=shield)](https://circleci.com/gh/cvisionai/tator)
[![CodeQL](https://github.com/cvisionai/tator/actions/workflows/codeql.yml/badge.svg)](https://github.com/cvisionai/tator/actions/workflows/codeql.yml)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Unlock the true potential of your imagery datasets with Tator, the flexible web platform that seamlessly marries video and complementary data streams. Experience advanced analytics through our state-of-the-art web video player, intuitive QA/QC and review tools, and seamless integration with third-party algorithms and dashboards.

Visit https://tator.io to learn more.

Quick start
===========

Install [Docker](https://www.docker.com/), then:

```bash
git clone --recurse-submodules https://github.com/cvisionai/tator
cd tator
cp example-env .env
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


Screenshots
===========

<img src="https://github.com/cvisionai/tator/assets/7937658/31eb1c49-aed3-4b2f-990f-27b410037532" alt="SAM applet" />
<p></p>
<img src="https://github.com/cvisionai/tator/assets/7937658/8ce714c8-ab7c-4648-9c53-493777e3182d" alt="Annotation view" />
<p></p>
<img src="https://github.com/cvisionai/tator/assets/7937658/9f423b3d-be1b-4664-afc8-c18527654b24" alt="Localization analytics view" />

Tator Enterprise
================

This repository has everything you need to run Tator on a single node. [Tator Enterprise](https://tator.io/product) can run on many nodes, autoscales with Kubernetes and Argo, integrates with third-party authentication, and more. Technical support is included with a Tator Enterprise subscription.
