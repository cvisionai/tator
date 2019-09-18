Tator
=====

Introduction
============

**Tator** is a web-based media management and curation project. It has three main components: Media Streaming, Media Annotation and Analysis, and Algorithm Inference, which feeds back into the annotation and analysis aspect. Built on [Kubernetes][kube], Tator consists of a core container that provides a REST API and facilities for asynchronous processing of transcodes and generic algorithms in conjunction with [Redis][redis], [tus][tus] and [Postgresql][postgresql]. Using the latest web standards, Tator provides responsive, frame accurate media playback in a variety of deployment scenarios. From a single node meant to deploy in an isolated lab, to a full-scale cloud deployment, Tator maintains the same architecture, interface, as well as the ability to seamlessly transfer data between deployment types.

Tator is maintained and supported by [CVision AI](www.cvisionai.com).

![projects](https://user-images.githubusercontent.com/7937658/65167417-83f95c00-da10-11e9-83aa-eec9db99c730.png)

![project-detail](https://user-images.githubusercontent.com/7937658/65167420-865bb600-da10-11e9-86b0-2e5d64a12885.png)

![annotation](https://user-images.githubusercontent.com/7937658/65167423-878ce300-da10-11e9-88e8-8c8926f45c6b.png)

Getting started
===============

* [Set up a deployment](doc/deployment.md)

[kube]: https://kubernetes.io
[redis]: https://redis.io
[tus]: https://tus.io
[postgresql]: https://www.postgresql.org

