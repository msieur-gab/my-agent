# The question bank

Everything the agent can say in reply to a typed question lives in this one file.
Each entry is a question a visitor might ask, a few other ways of asking it, the reply in my words,
and where it leads. The page matches what was typed against the questions here, by meaning
(a small embedding model in the browser) and by words, and says the reply of the closest one.
Nothing is generated: if a sentence isn't in this file or in a piece, the page can't say it.

How an entry is written:

    ### The question, the way a visitor would ask it
    - Another way of asking it
    - And another, shorter or with jargon
    say: What I answer, one or two sentences, in my voice.
    leads: senz

`leads` is where the reply takes them: a piece by its slug (`senz`, `autoflow`…), `invite`
(nothing to show, send me the question), `all` (the list of work), `page:how-this-site-works`,
`contact` (the form), `more` (the next piece on the current topic), or nothing (just the reply).
A second `say:` line is said as a second line. Sections (`##`) group entries by topic and feed
the "Also on this" suggestions. The section's `{id}` matches a theme in site.json.

About me, how I work, money and terms: the replies there are drafts, to rewrite or delete.
An entry that leads to `invite` is fine when the honest answer is "ask me".

## Ideas that never get tested {ideas}

### How can my team test an idea before we commit a budget?
- Is there a way to try an idea before we fund it properly?
- We want to validate a concept before asking for money
- How do we test an idea cheaply
- Good ideas die in our budget committee
- How do we try an idea without a business case first?
say: At Allianz, a claims handler could sketch an idea on paper and have it running in days, before anyone asked for a budget. That was Senz.
leads: senz

### How do we stop debating ideas and start learning from them?
- We keep arguing about ideas instead of trying them
- Too many opinions, not enough tests
- How do we move from discussion to experiment
say: Make the test cheaper than the meeting about it. Senz did that: the unit of measurement moved from the idea to the test.
leads: senz

### Can people without a technical background build a prototype themselves?
- Can non-developers make a working prototype
- Our experts are not technical, can they still build something
- Prototyping for people who can't code
say: Yes. With Senz, underwriters and product managers drew an interface on paper, a vision model read it, and it deployed as production code in the company's design system.
leads: senz

### How do we make failing cheap enough that people dare to try?
- How do we lower the cost of failure
- Nobody dares to experiment here because failing is expensive
- How do we make it safe to fail
- Our teams are afraid of failed pilots
- How do we make experimenting less risky for people?
say: By removing the budget gate in front of every test. When a test costs days, not quarters, failure stops being a career risk.
leads: senz

### The board wants proof, not another deck. Where do we start?
- Our board wants evidence, not slides
- How do we show results instead of presentations
- Management asks for proof before funding anything
- My boss wants to see something working, not slides
- How do we convince leadership without another presentation?
say: Start with something that runs. A working prototype in front of real users says more than any deck, and with Senz an expert could have one in days.
leads: senz

### Our innovation lab is too slow. How do we speed it up?
- How do we accelerate innovation in a large company
- Our innovation process takes forever
- Corporate innovation is too slow
- Everything takes forever in our lab
- Why does it take us a year to ship a pilot?
say: Most of what a lab needs already exists inside the company: components, data, design system, people who know. Senz recombined that matter instead of adding more.
leads: senz

### Everyone agrees something must change. Nobody agrees on what.
- We all know we need to change but can't agree on the direction
- Our organisation is stuck
- Nobody agrees on what to do next
- We all want change but nobody agrees on the direction
- The company is stuck between competing visions
say: Then stop deciding and start testing. Senz let people inside Allianz test their own answer instead of winning the argument first.
leads: senz

### How do we make a design system adoptable?
- Nobody uses our design system
- How do we get teams to adopt the design system
say: Meet people at the tool they already use. Senz read paper sketches and produced components from the company's own design system, so adoption was a side effect.
leads: senz

### Can one small test open a new market?
- Can a prototype change the business
- Has a test ever opened a new segment
say: Once. An agent on bike insurance used Senz to test a near-zero-cost service for cyclists the company had written off. The segment started to engage.
leads: senz

## AI you can actually trust {trust}

### What should an AI do when it is not sure?
- Can we have an AI that says I don't know
- How do we build an AI that admits uncertainty
- What happens when the model doesn't recognise the input
- What does your system do when the model is unsure?
- How does your tool behave when it has low confidence?
say: Say so. The model in Senz was trained never to pretend: below its confidence threshold it told the user it hadn't recognised the shape. AutoFlow does the same, the strokes erase themselves.
leads: senz

### Do we even need a large language model for this?
- Do we need an LLM
- Is a big model necessary
- Can a small model do the job
- Is a big AI model overkill for a simple task?
- Is there something lighter than an LLM for classification?
say: Often not. Dowgo's documents were sorted by pattern matching, not an LLM. This page runs on a 23 MB model. The question is what the task needs, not what's fashionable.
leads: dowgo

### Should we add AI to sort our documents?
- Should we use AI to categorise our files
- Can an LLM classify our documents
say: For Dowgo the brief was AI categorisation. I said no: regex against the known anatomy of a data room sorted the same documents, in milliseconds, with no data leaving the device.
leads: dowgo

### Is it safe to send sensitive documents to an AI model?
- Can we send confidential files to ChatGPT
- Is it risky to put client documents into an AI
say: For investment documents it wasn't a risk the engagement could justify. At Dowgo the classification ran locally and exposed nothing to a third party.
leads: dowgo

### Should the AI run on our own servers?
- Should we host the model ourselves
- On-premise or cloud for our AI
say: Senz ran on Allianz's own hardware with no remote API calls, a 2018 decision most 2026 AI products still haven't made. It kept the compliance posture in the company's hands.
leads: senz

### How do we keep a human in control of the decision?
- How do we keep humans in the loop
- We don't want the AI to decide for us
say: Make the model a translation layer, never a generative one. In Senz every decision was the user's, and therefore auditable by the user.
leads: senz

### How can we trust a risk score?
- How do we know a risk score is right
- Can we verify what the compliance tool computes
say: Only if you can see the arithmetic. AutoFlow publishes its scoring model on an audit page: every weight and threshold, with a calculator anyone can check.
leads: autoflow

## GDPR and data protection {gdpr}

### Where does our personal data actually go?
- How do we see where personal data flows in our organisation
- We don't know where our customer data ends up
- How do we map our data flows
say: Draw it. AutoFlow turns a hand-drawn flow into a Sankey where the thickness of a band is how much personal data moves and its colour is how exposed it is.
leads: autoflow

### How do we make GDPR understandable to people outside legal?
- How do we explain GDPR to non-lawyers
- How do we help people understand what GDPR requires
- GDPR training that isn't a slide deck
- How do we teach data protection to non-lawyers?
- How do I get my colleagues to understand privacy rules?
say: Let them build the flow. In AutoFlow the act of drawing and connecting the modules teaches the regulation's logic. The interaction is the training.
leads: autoflow

### Can we use our customer data with AI and stay GDPR-compliant?
- Can we use AI and still pass GDPR
- Is it possible to combine AI and GDPR compliance
say: Yes, if the data doesn't travel. AutoFlow runs a small model in the browser and the flow never leaves the device. The tool practises what the regulation preaches.
leads: autoflow

### Compliance keeps saying no. What would a yes look like?
- Legal blocks everything we propose
- Our DPO always says no
- The privacy team blocks every feature we propose
- How do we get past legal objections?
say: A yes looks like a diagram where the risk is visible before legal has to say anything. AutoFlow shows a thick red band crossing a border at a glance.
leads: autoflow

### Can regulation be a design brief instead of a blocker?
- Can we treat GDPR as a design constraint
- Is regulation an obstacle or a brief
say: AutoFlow is built on exactly that. The shape of the canvas, left to right, teaches the shape of the regulation.
leads: autoflow

### Is there an alternative to compliance spreadsheets?
- Our record of processing activities is a spreadsheet nobody reads
- ROPA tools are just data entry
- Our ROPA lives in Excel and nobody reads it
- Is there a better way than a compliance spreadsheet?
say: A ROPA describes a network: who collects, what happens, where it goes. AutoFlow answers that with a path through a diagram, not cell B247.
leads: autoflow

### How do we anonymise data before sharing it?
- How do we anonymise an employee list before sending it
- We need to share data safely
say: Without a developer or a cloud service. AutoFlow's modules anonymise, encrypt and document the data on the device of the person who is responsible for it.
leads: autoflow

### Our compliance tool is hosted in the US. Is that a problem?
- Is it a risk that our GDPR tool runs on American servers
- Our compliance platform is a US SaaS
say: It can be. The map of your personal data processing is itself the most sensitive document you own. AutoFlow never lets that map leave the device.
leads: autoflow

## Privacy by design {privacy}

### Can the data stay on the user's device?
- Can we build this without a server
- Local-first instead of cloud
- Can a product run entirely in the browser
say: Yes, and it changes what the product can promise. AutoFlow and Pebbble have no server and no account; a page that can't hold your data can't leak it.
leads: autoflow

### Can a product work without an account?
- Can we avoid sign-up entirely
- Do we need user accounts
say: An account is a target. In Pebbble, physical possession of the stone is the only authentication: no password, nothing to subpoena.
leads: pebbble

### What happens to my data if the company disappears?
- What if the startup behind the product shuts down
- Can my messages survive the company
- What if the company behind the product goes bust?
- Do the recordings survive if the service shuts down?
say: In Pebbble the voice is stored on IPFS and the key is derived from the stone itself. There is no company in the loop that can take it with it.
leads: pebbble

### Can a message survive censorship?
- Can content be blocked
- How do you reach someone behind a firewall
say: Pebbble distributes the voice on IPFS: block one node, it routes through another; block a domain, there is no domain to block.
leads: pebbble

### Can a children's product work without tracking children?
- A business for children that doesn't collect data
- Can kids use something connected without being tracked
say: Vrooom sends zero data to any server. The toy works without its app, and the business grows because parents come back, not because they're brought back.
leads: vrooom

## Presence across distance {distance}

### How can a child keep a parent's voice when they live apart?
- How can my child hear my voice when I'm far away
- A father separated from his daughter by a border wants to stay in her life
- My kids live abroad with their mother
say: Put the voice in something the child can hold. Pebbble is a hand-shaped stone with a sealed NFC tag: tap it to a phone and hear a parent's voice.
leads: pebbble

### How do I stay present for a child who lives far away?
- How do I stay close to my child across distance
- Staying in touch with a young child in another country
say: Not with a scheduling app. A familiar voice is a safety cue for a child from birth; Pebbble carries it in a stone that nobody can block.
leads: pebbble

### How do I leave a message my child can only open years from now?
- Can I record something for my child's 18th birthday
- A message that waits years before it opens
say: A Pebbble message can wait. The chip has no battery and draws power only when read; a voice for an 18th birthday can sit on a nightstand for a decade.
leads: pebbble

### Why voice instead of text or video?
- Isn't video better than audio for a child
- Why not just send texts
say: Hearing a loved one's voice lowers cortisol and raises oxytocin. A text does neither, and video confirms the parent isn't here. Voice accompanies.
leads: pebbble

### What if the device the child uses is monitored?
- What if someone checks the child's phone
- The child uses a borrowed tablet
say: Pebbble has an ephemeral mode: the audio plays once and when the app closes nothing remains. No history, no cache, no evidence.
leads: pebbble

### How do you design for a child who cannot read?
- Designing for a three-year-old
- An interface for kids who can't read yet
say: Remove the interface. A child doesn't need to understand NFC: hold the stone to the phone and hear mama's voice.
leads: pebbble

### Can technology hide inside an ordinary object?
- Can a device look like a normal thing
- Invisible technology in everyday objects
say: Pebbble looks and feels like a river pebble. People try to see how it opens. There is nothing to find.
leads: pebbble

## Children and screens {screens}

### Can digital play happen without a screen?
- Games for kids without screens
- How can kids play with technology but not on a screen
say: Vrooom is a wooden car with an NFC tag: tap it at a playground, earn a badge, print it and glue it into a handmade passport. The phone witnesses the adventure, it doesn't run it.
leads: vrooom

### Can a toy be connected without being addictive?
- A connected toy that isn't designed to hook children
- Is a non-addictive connected toy possible
say: Vrooom refuses the mechanics: no points, no streaks, no leaderboards. Fifteen seconds of screen time per session, held by the parent.
leads: vrooom

### How can kids use technology without more screen time?
- How do we reduce our children's screen time
- Technology for kids that doesn't add screen time
say: Let the digital part exist only to send parents and kids outside together. That is the whole design of Vrooom.
leads: vrooom

### How do we get parents off their phones at the playground?
- Parents are on their phones while kids play
say: The phone is not the villain. In Vrooom it belongs to the parent and does one thing, a check-in, in fifteen seconds.
leads: vrooom

## Product discovery without advertising {discovery}

### How do people discover a product without ads?
- Can a product grow without advertising
- How do we grow without an ad budget
say: The utility earns the visit, the visit earns the discovery. With Vrooom, every badge a parent prints sends them to the catalogue, without an ad or a captured email.
leads: vrooom

### Can the object itself be how people find the product?
- Can the product be its own marketing
- Word of mouth through the object
say: A wooden car on a playground gets asked about. Vrooom is a business model disguised as a toy.
leads: vrooom

### How does the business make money without ads?
- What's the business model if you don't track or advertise
- How do you monetise without ads
say: A parent standing at a printer, choosing to print something for their child, is the growth channel. If the product deserves the next purchase, it gets it.
leads: vrooom

### How do we grow without tracking users?
- Growth without analytics
- Can we grow a product with no tracking
say: This page is one answer: it counts a theme click at most once per visit, with no identifier. Vrooom is the other.
leads: vrooom

## Stuck organisations and complexity {stuck}

### We're raising. How do we get due diligence under control?
- We are raising money and the data room is a mess
- How do we prepare a due diligence data room
- Fundraising paperwork is out of control
say: For Dowgo I kept the file system everyone knew and put an agent beside it that shows what's missing, who has to act, and what comes next.
leads: dowgo

### Our process has grown too complex. Where does the friction come from?
- Our workflow is too complicated
- Where does the complexity in our process come from
say: Usually not from the work, from tracking it. At Dowgo the cognitive load wasn't filing documents, it was holding the whole process in your head.
leads: dowgo

### How do we improve a tool without making people learn something new?
- How do we change our software without retraining everyone
- Users won't accept a new interface
say: Augment, never replace. Dowgo's users kept their file system; the conversational layer was inserted alongside it and gave it a voice.
leads: dowgo

### Why not just build a dashboard?
- Should we build a dashboard for this
- We need a better overview, maybe a dashboard
say: I sketched five for Dowgo. Each was technically correct and emotionally wrong: dashboards make the user do the triage that was already exhausting them.
leads: dowgo

### What can a consultant deliver in two weeks?
- What can you do in two weeks
- Is a two-week engagement worth it
- What can you do for us in a few weeks?
- How much can you achieve in a short engagement?
say: At Dowgo: working code in the client's production stack, a design system, interaction sketches and the written intent behind each decision.
leads: dowgo

### How do you work in a domain you do not know?
- You don't know our industry, how can you help
- Do you need domain expertise to redesign our product
- You don't know our industry, how could you understand our users?
- Do you need to know our sector to help?
say: Blockchain, renewable energy, investment compliance: I knew none of it going into Dowgo. Finding the real problem needs expertise in how people work, not in the domain.
leads: dowgo

### How do you push back on a client's brief?
- What if our brief is wrong
- Do you challenge the brief
say: At Dowgo the brief was AI categorisation. I asked for time to listen before touching a screen, and the answer turned out to be a voice, not a feature.
leads: dowgo

### How do I explain this to my board in plain words?
- How do I explain a technical topic to management
- Making complexity legible for executives
say: Show them a picture that is also the document. AutoFlow's diagram is the record of processing, and a thick red band needs no explanation.
leads: autoflow

## About me {me}

### Who are you?
- Who is Gabriel
- What do you do
- Tell me about yourself
say: I'm Gabriel Baude, a designer and creative technologist in Munich, working across Europe. Ask me about a problem and I'll answer with the work.
leads: all

### What is your background?
- What's your story
- What have you done before
say: Engineer and industrial designer by training. Head of innovation at Etisalat, Orange, Huawei and Allianz's Kaiser X Labs; now independent. I design systems and build them.
leads: all

### Where are you based?
- Where do you live
- Which city are you in
- Are you in Germany
say: Munich. I work across Europe, remotely or on site.

### Do you work remotely?
- Can you work remote
- Do you have to be on site
say: Remotely from Munich, and on site when it matters: workshops, kick-offs, testing with users.

### Which languages do you speak?
- Do you speak French
- Can we work in German
- What languages do you work in
say: French is my first language and English my working one, with some Spanish and Chinese.

### Are you available?
- When could you start
- Are you free for a project
- Are you taking new work
say: Let's find out. Send me a line about what you're facing and I'll tell you when I can start.
leads: contact

### Do you work freelance or would you join a team?
- Are you looking for a job
- Would you consider a permanent position
- Freelance or employee
- Would you take a full-time position?
- Are you open to employment?
say: I'm independent, and open to the right team if the problem is worth it. Tell me about yours.
leads: contact

### What is your day rate?
- How much do you cost
- What are your rates
- How much does a project cost with you
- Ballpark price for an engagement?
- What would two months of your time cost?
say: It depends on the shape of the work. Tell me what you're facing and I'll answer with a number.
leads: invite

### How long does a project take?
- How long does an engagement last
- What's your typical timeline
say: Dowgo was two weeks from first conversation to working code. Senz was three years. Tell me the problem and I'll tell you the scale.
leads: dowgo

### Do you sign NDAs?
- Can you sign a confidentiality agreement
say: Ask me directly and I'll answer in a message.
leads: contact

### How many years of experience do you have?
- How experienced are you
- How long have you been doing this
say: Over twenty, across three continents. Set-top boxes at Orange, innovation at Huawei in Shenzhen, Kaiser X Labs for Allianz until 2024.
leads: all

### Which industries have you worked in?
- Do you have experience with insurance
- Have you worked in fintech
- Which sectors do you know
say: Insurance, telecoms, fintech, media, education. The industry matters less than how its people work; I walked into Dowgo knowing nothing about blockchain.
leads: all

### Have you worked with startups?
- Do you work with small companies
- Startup experience
say: Yes. Dowgo was a two-week engagement with a startup's CTO, delivered straight into their production stack.
leads: dowgo

### Can I see your CV?
- Do you have a resume
- Are you on LinkedIn
- Where can I find your profile
say: The work on this site is the CV. For the rest, write to me and I'll send it.
leads: contact

### Do you have references?
- Can I talk to a past client
- Who can vouch for you
say: Ask me and I'll put you in touch.
leads: contact

## How I work {process}

### What is your process?
- How do you start a project
- How do you approach a new problem
- What does working with you look like
say: Listening before designing. I map how people actually work, not how they say they do, and look for the question behind the brief. Then I build the smallest thing that answers it.
leads: dowgo

### What do you deliver at the end?
- What are your deliverables
- Do you deliver code or designs
- Do you hand over design files or working code?
- What do we get at the end of an engagement?
say: Something that runs. Working code when it's the fastest proof, prototypes people can test, and the written reasoning behind each decision so the team can go on without me.
leads: dowgo

### Do you write code yourself?
- Do you code
- Are you a developer too
say: Yes. Dowgo shipped as React in the client's repository; AutoFlow and Pebbble are vanilla JavaScript I wrote end to end. Code is a design material.
leads: autoflow

### Do you work alone or with a team?
- Do you have a team
- Who do you work with
say: Both. Senz was a core team of three; Dowgo and AutoFlow were solo. I fit the shape of the problem.
leads: senz

### What tools do you use?
- Which software do you use
- Which AI tools do you use
say: Pen and paper first. Then whatever the problem needs: web components, small on-device models, Figma, a workbench. AI tools as instruments, with the decisions kept mine.
leads: autoflow

### What does "the question nobody asked" mean?
- What is the question nobody asked
- Why do you talk about the question nobody dares to ask
say: Most briefs ask to ease the symptoms of an existing service. The question nobody asked is the one that finds the root cause, and changes how the system works instead of patching the wrong fix.
leads: senz

### Do you run workshops?
- Can you facilitate a workshop
- Do you do training
say: Yes, when a workshop is the fastest way to find the question. Ask me about your situation.
leads: contact

### Do you do user research?
- Do you run user interviews
- Do you test with users
say: Always. Dowgo started with a week of listening before I touched a screen; Senz was redesigned around what we saw users do with their sketches.
leads: dowgo

### Do you design interfaces too?
- Do you do UI design
- Can you design screens
say: Yes, and I'd rather the interface disappear. Vrooom needs fifteen seconds of screen; Pebbble's reader is a voice and nothing else.
leads: vrooom

### Do you do logo design?
- Can you design a logo
- Do you do branding
say: No. I'm the wrong person for a logo. I can point you to people who do it well.

### What do you not do?
- What's out of scope for you
- What should I not ask you
- Do you do marketing?
- Can you do our branding?
- Do you do SEO or social media?
- We need a brand identity
say: Logos, marketing campaigns, pure visual polish. I work on how systems behave and how people meet them.

### What makes you different?
- Why should I hire you
- What's special about your approach
- Why you rather than an agency?
- Why should we work with you?
say: I build what I design, I say no to the modern answer when the old one works, and I look for the question behind the brief. The work here shows all three.
leads: all

### What is your best project?
- What are you most proud of
- Which project should I look at first
say: Senz. It let people inside Allianz test ideas in days instead of quarters, in 2018, before any of today's tools.
leads: senz

### What are you working on now?
- What's your current project
- What are you building these days
say: AutoFlow, a GDPR workbench where you draw the data flow and the diagram shows where the risk lives. And this page.
leads: autoflow

### Who is this site for?
- Who is this page for
- What is this site
say: For anyone facing a problem I might have met: a team that can't test ideas, a DPO drowning in spreadsheets, a parent far from a child. And for the curious.
leads: all

## Talk {talk}

### Hello
- Hi
- Hey there
- Good morning
- Bonjour
say: Hello. Tell me what you're stuck on, and I'll show you what I did when I met the same question.

### Thanks
- Thank you
- Merci
- Cheers
- Thx
- Thanks a lot
- Great, thank you
say: You're welcome.

### Are you an AI?
- Am I talking to a bot
- Is this ChatGPT
- Who am I talking to
say: No language model is writing this. The page matches your question against a bank of questions I wrote and shows you the closest answer, in my words. When nothing fits, it says so.
leads: page:how-this-site-works

### How does this site work?
- How does this work
- What is this page doing
say: A small model in your browser compares your question with the ones I've written, by meaning. The reply is one I wrote; nothing is generated and nothing is stored on your device.
leads: page:how-this-site-works

### What can I ask?
- Help
- What should I ask you
- What do you know
say: Anything you'd ask before starting a project. These are the questions I hear most.

### How can I contact you?
- Can I hire you
- Get in touch
- Can we have a call
- What's your email
say: Write to me here. I read and answer every message myself.
leads: contact

### Tell me more
- More
- What else
- Another example
- Go on
leads: more

### Show me all your work
- Show me everything
- What have you done
- Can I see your portfolio
- Do you have case studies
- List your projects
- All your projects
- Your portfolio
say: Here is all of it. Swipe through, or pick one.
leads: all
