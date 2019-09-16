Tator
=====

Introduction
============

**Tator** is a web-based media management and curation project. It has three main components: Media Streaming, Media Annotation and Analysis, and Algorithm Inference, which feeds back into the annotation and analysis aspect. Built on [Kubernetes][kube], Tator consists of a core container that provides a REST API and facilities for asynchronous processing of transcodes and generic algorithms in conjunction with [Redis][redis], [tus][tus] and [Postgresql][postgresql]. Using the latest web standards, Tator provides responsive, frame accurate media playback in a variety of deployment scenarios. From a single node meant to deploy in an isolated lab, to a full-scale cloud deployment, Tator maintains the same architecture, interface, as well as the ability to seamlessly transfer data between deployment types.

Tator is maintained and supported by [CVision AI](www.cvisionai.com).

Getting started
===============

* [Set up a deployment](doc/deployment.md)

[kube]: https://kubernetes.io
[redis]: https://redis.io
[tus]: https://tus.io
[postgresql]: https://www.postgresql.org

