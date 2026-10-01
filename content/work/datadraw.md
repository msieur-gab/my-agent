---
title: DataDraw
type: work
context: commissioned
year: 2026
where: EU SME · regtech
draft: true
themes: [gdpr, trust, privacy]
intro: I worked on exactly that with DataDraw.
brief: "We need to be GDPR-compliant."
question: Why can only legal see where the risk is?
answer: Draw how data moves through the company by hand. A tiny model running in the browser turns the drawing into a working pipeline that anonymises, encrypts and documents the data, without it ever leaving the device.
keywords: [gdpr, privacy, data protection, personal data, compliance, compliant, regulation, regulatory, legal, risk, dpo, anonymise, anonymize, anonymisation, anonymization, encrypt, encryption, sensitive data, hr, patient, health, sharing data, data flow, audit, explain, explainable, ai act, local, on-device, browser, sovereignty]
answers:
  - Where does our personal data actually go?
  - How do we make GDPR understandable to people outside legal?
  - Can we use our customer data with AI and stay GDPR-compliant?
  - Compliance keeps saying no. What would a yes look like?
  - Can regulation be a design brief instead of a blocker?
  - Can the data stay on the user's device?
  - How do we anonymise data before sharing it?
---

## The situation

The HR manager told to "anonymise this employee list before sharing it". The doctor sending patient data to a specialist. The compliance officer reporting an incident without exposing identities. All of them carry legal responsibility for data they can't technically protect.

## What everyone assumed

That compliance is a legal problem, solved by policies, training and a cloud service that processes the data, which defeats the point.

## The reframe

Compliance fails when only legal can see the risk. The people who carry the responsibility already know what the data should look like before it's shared. They just need the controls GDPR asks for, without having to be technical.

## What got built

Draw a pipeline with hand-drawn shapes, and each shape becomes a step: load, check, anonymise, enrich, encrypt, export. The sketch is the program.

A tiny shape-recognition model (42 KB, 98.6% accurate) and a small language model run entirely in the browser, so plain sentences like "anonymise email addresses" configure the steps. Nothing leaves the machine.

## What changed

Privacy by architecture, not by policy. The domain expert does the protecting, and the data never travels to do it.
