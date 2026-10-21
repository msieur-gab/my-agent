# What the agent understands

Each `## name` is one kind of message. Under it:
- `reply:` what the agent says, word for word (nothing is generated)
- `offer:` what comes with it: `topics`, `form` (send me the question), `how` (link to how this site works) or `work` (all the work)
- `- …` sentences people might type. The model learns from these: more, and more varied, is better.

Four kinds have no reply of their own. `more` offers another piece, `list` shows all the work.
`problem` is a question about the visitor's own situation: it goes to the search through my work.
`out_of_scope` is anything the site isn't for: it gets the honest "no answer".
Below its confidence threshold the model abstains and the search through my work decides.

Rebuild after editing: `python3 build/build.py`.
The replies under where, languages, rate, availability, background, process, services and why are
drafts by Claude, written from what I've said about myself, for me to rewrite.

## greeting
reply: Hello. Tell me what you're stuck on, and I'll show you what I did when I met the same question.
offer: topics

- hi
- hello
- hey
- hey there
- hello there
- hi gabriel
- hello gab
- hallo
- bonjour
- salut
- servus
- guten tag
- good morning
- good afternoon
- good evening
- morning
- hiya
- greetings
- yo
- hi how are you
- hello how are you doing
- hey whats up
- nice to meet you
- hi there gabriel

## thanks
reply: You're welcome.

- thanks
- thank you
- thx
- merci
- danke
- cheers
- thanks a lot
- thank you very much
- thank you so much
- ok thanks
- great thanks
- perfect thank you
- nice thanks
- thanks that helps
- that was helpful thanks
- thanks gabriel
- many thanks
- appreciate it
- danke schön
- merci beaucoup
- got it thanks
- cool thank you

## who
reply: I'm Gabriel Baude, a designer and creative technologist in Munich, working across Europe. Ask me about a problem and I'll answer with the work.
offer: topics

- who are you
- who is gabriel
- who is this
- who is gab
- what do you do
- tell me about yourself
- tell me about you
- about you
- introduce yourself
- what is your job
- whats your job
- what is your story
- what kind of designer are you
- what do you do for a living
- who am i looking at
- whose site is this
- what is your role
- are you a designer
- so what do you do exactly
- describe yourself

## how
reply: No language model is writing this. The page matches your question against my own projects and notes and shows you the closest piece, in my words. When nothing fits, it says so.
offer: how

- how does this work
- how does this site work
- how does the page work
- how do you work as a chatbot
- what is this
- what is this site
- what is this page
- are you an ai
- are you a bot
- are you a robot
- are you human
- are you a real person
- is this chatgpt
- is this an ai
- is this a chatbot
- is this real
- are you chatgpt
- are you claude
- is this an llm
- who am i talking to
- who am i chatting with
- am i talking to a machine
- is a person answering
- is this automated
- what model are you
- do you use gpt
- is gabriel typing this
- r u a bot
- are you an actual human

## what
reply: Anything you'd ask before starting a project. These are the questions I hear most.
offer: topics

- help
- what can i ask
- what should i ask
- what can you do
- what can you answer
- what can you tell me
- what do you know
- what do you have
- what questions can i ask
- where do i start
- i dont know what to ask
- give me an example question
- how do i use this
- what am i supposed to type
- any suggestions
- what topics do you cover
- what can i ask you about
- not sure what to ask
- show me some questions

## contact
reply: Write to me here. I read and answer every message myself.
offer: form

- contact
- get in touch
- how can i contact you
- how do i reach you
- can i contact you
- can i email you
- what is your email
- whats your email address
- can i call you
- can we talk
- lets talk
- i want to talk to you
- i would like to work with you
- i want to hire you
- can i hire you
- how do i hire you
- how can i book you
- i have a project for you
- send you a message
- leave a message
- write to you
- reach out
- your phone number
- can we schedule a meeting
- let's set up a call
- can we have a call

## more
- more
- tell me more
- go on
- what else
- anything else
- next
- another
- another one
- another example
- show me more
- show me another
- show me another one
- something else
- keep going
- continue
- and then
- other examples
- next one please
- any other
- different one

## list

- show me all your work
- show me your work
- all your projects
- your portfolio
- see your portfolio
- list your projects
- what have you done
- what have you made
- what have you built
- do you have case studies
- show case studies
- examples of your work
- browse your work
- see everything
- show everything
- what projects do you have
- can i see your projects
- your work please
- list all projects
- what else is there
- what do you have to show
- show me the portfolio

## where
reply: I'm based in Munich and work across Europe.
offer: form

- where do you live
- where are you
- where are you from
- which city are you in
- are you in munich
- are you in germany
- do you live in germany
- can you work remote
- remote work possible
- do you travel for projects
- can you come to our office
- do you work on site
- can you work from abroad
- which countries do you work in
- do you work in france
- do you work with clients in other countries
- would you relocate
- what time zone are you in
- are you europe based
- where is your studio
- are you based in europe
- do you only work in germany
- can you work for a company in switzerland
- do you work in the us
- where are you based
- do you work remotely
- do you work outside germany

## languages
reply: French is my first language, I work in English, and I get by in Spanish and Chinese.

- what languages do you speak
- do you speak german
- do you speak french
- do you speak english
- sprechen sie deutsch
- parlez vous français
- can we work in german
- is english ok
- which language do you work in
- are you bilingual
- do you speak chinese
- do you speak spanish
- can you present in french
- what is your native language
- what is your mother tongue
- language skills
- which languages do you speak

## rate
reply: It depends on the question more than on the hours. Tell me what you're facing and I'll come back with a proposal.
offer: form

- how much do you charge
- what are your rates
- what is your hourly rate
- whats your daily fee
- how expensive are you
- what do you cost
- what would you cost us
- price for a project
- your pricing
- do you have a price list
- are you affordable
- what is your budget range
- what is the minimum budget
- do you work for a fixed price
- do you work on retainer
- can we pay per project
- how do you bill
- how long is a typical engagement
- how many weeks does a project last
- what does a typical project cost
- do you sign an nda
- will you sign a confidentiality agreement
- payment terms
- tagessatz
- how much would you charge for a workshop
- what does a day with you cost
- do you do fixed price
- how long would it take
- how long do your projects usually take
- what is your day rate
- how much does a project cost
- do you take fixed-price projects
- do you sign ndas

## availability
reply: Tell me what you have in mind and when, and I'll tell you honestly whether I can take it on.
offer: form

- are you free right now
- are you taking new projects
- do you have time for a new project
- when are you free
- what is your availability
- can you start next month
- how soon can you start
- are you booked
- are you open to work
- are you looking for a full time role
- would you take a permanent position
- are you job hunting
- would you join our company
- do you freelance
- are you a freelancer
- are you independent
- can you join our team for six months
- are you open to a contract
- do you accept interim roles
- would you be our head of design
- are you available for a project
- are you available now
- can you take on work
- available for freelance
- when could you start
- do you work freelance or would you join a team
- are you looking for a job

## background
reply: I trained as an engineer and industrial designer, then led innovation and design at Orange, Etisalat, Huawei and Allianz's Kaiser X Labs. Now I work independently.
offer: work

- what is your experience
- how long have you been doing this
- how many years in the field
- what did you study
- where did you study
- what is your education
- where did you work before
- who have you worked for
- what companies have you worked with
- who are your clients
- which sectors do you know
- have you worked in insurance
- have you worked in telecom
- do you know banking
- have you worked for big corporations
- do you work with small companies
- do you have startup experience
- can i get references
- do you have testimonials
- where is your resume
- can i download your cv
- your linkedin profile
- do you have a linkedin
- what is your career path
- what was your last job
- show me your cv
- i want to see your cv
- are you on linkedin
- what clients have you had
- which brands have you worked for
- how many years of experience do you have
- which clients did you work with
- which industries have you worked in
- do you have experience with insurance
- have you worked with startups
- do you have references
- can i see your cv

## process
reply: I start with questions, to find the root cause behind the brief. Then I build something people can try early, so we learn from it instead of debating it.

- how do you work with clients
- what is your method
- what is your approach
- describe your design process
- what happens in the first week
- what are the first steps
- how does a project with you start
- what is the first thing you do
- what will we get at the end
- what are your deliverables
- what do you hand over
- do you work solo
- do you have a team
- do you bring other people
- do you code
- can you program
- are you technical
- do you build prototypes yourself
- which software do you use
- what is your tool stack
- do you use figma
- what do you mean by the question nobody asked
- why questions first
- how do you run a workshop
- how do you start
- what is your workflow
- do you write the code
- what tools do you work with
- what is the question nobody asked
- how would we work together
- what is your process
- how do you start a project
- what do you deliver at the end
- do you work alone or with a team
- do you write code yourself
- what tools do you use
- what does the question nobody asked mean

## services
reply: I work on the problem behind a product: framing it, prototyping, designing and building what's needed to test it. Tell me your case and I'll say whether I'm the right person.
offer: form

- what services do you offer
- what do you offer
- what kind of projects do you take
- do you facilitate workshops
- can you run a design sprint
- do you do research with users
- do you do usability testing
- can you design our app interface
- do you do ux
- do you do ui design
- can you make our website
- do you design logos
- can you do our branding
- do you do graphic design
- do you speak at conferences
- do you lecture
- do you give trainings
- can you coach our team
- what is outside your scope
- what kind of work do you refuse
- do you do consulting
- can you audit our product
- do you do strategy
- do you run trainings
- do you teach
- do you give talks
- what dont you do
- do you do workshops
- do you run workshops
- do you do user research
- do you design interfaces too
- do you do logo design
- do you teach or give talks
- what do you not do

## why
reply: Judge by the work. Each piece starts from the brief I was given and the question that changed it.
offer: work

- why you
- why should we work with you
- why choose you over an agency
- what sets you apart
- what is special about you
- how are you different from other designers
- what makes your work different
- convince me
- what is your best work
- which project are you proudest of
- what is your favourite project
- your strongest case
- what are you doing at the moment
- what are you currently working on
- who do you work for
- who is your ideal client
- who should contact you
- what is this site for
- what are you proud of
- what are you up to these days
- who is this for
- why hire you
- what makes you different
- why should i hire you
- what is your best project
- what are you most proud of
- what are you working on now
- who is this site for

## problem
- our team spends months before testing anything
- we have too many ideas and no way to try them
- management only trusts slide decks
- how do i convince leadership to try something new
- our prototypes never reach production
- we cannot get budget for experiments
- our developers are a bottleneck
- non designers want to sketch their own screens
- our ai assistant invents facts
- customers do not trust our chatbot
- how do we stop a model from guessing
- we want an assistant that admits it does not know
- how do we keep a human in the loop
- can a model explain its decision
- our legal team blocks every ai project
- we need a record of processing activities
- how do we show where customer data travels
- our dpo cannot read our data flows
- we are afraid of fines under gdpr
- how do we share data without exposing names
- our data room is a mess
- investors keep asking for missing documents
- due diligence is eating our time
- our users have to learn a new tool every year
- how do we simplify a process nobody understands
- my children live in another country
- how do i stay close to my kids from far away
- how can my daughter hear my voice when i am away
- i want to leave messages for my son
- separated parents and children
- kids spend too much time on tablets
- we want a toy without a screen
- how do we make a connected toy that is not addictive
- how can children express emotions without a device
- how do we grow without advertising
- how do we sell a product without tracking people
- we want our data to stay in europe
- can our product work without user accounts
- can the data stay on the phone
- what happens to my recordings if your company closes
- our compliance training is boring
- how do we explain regulation to engineers
- we want to automate document sorting
- our innovation lab produces nothing
- we keep having meetings about ideas
- our product team fights over priorities
- we built an ai pilot that nobody uses
- which ai use cases are worth it
- is our product accessible enough
- we are a startup raising a seed round
- which model did you use for sketch recognition
- how does the stone play audio
- why did you choose wood for the car
- how is the audio encrypted
- what does the band colour mean in the diagram
- how did employees use the platform
- what did the insurance experiment show
- what did you deliver to the startup
- we speak different languages in the family
- my son speaks another language than me
- our teams work in three languages
- how do we translate our product for children
- we have no technical people in the team
- our team cannot code
- my team has no budget and no developers
- how do i start a project like this in my company
- where do we start with ai
- we do not know where to start
- what tools should our team use for prototyping
- our process takes too long
- how much does it cost us to test an idea
- testing an idea costs us a fortune
- our workshops never lead anywhere
- we run workshops but nothing changes
- i want my team to build things themselves
- can my colleagues make an app without developers
- how do i get my manager to try this
- we need proof before the board meeting
- our clients do not trust ai answers
- i want to talk to my kids every day
- my daughter is too young for a phone
- i am a father living far from my children
- our users want privacy
- we need to anonymise a spreadsheet
- our customers are in europe and so is our data
- we are designing for children
- i run a toy company
- our startup needs to organise documents for investors

## out_of_scope
- what is the weather in berlin
- tell me a joke
- play some music
- what is two plus two
- who is the president of france
- recommend a good movie
- how do i cook pasta
- best restaurants nearby
- train times to hamburg
- what is the meaning of life
- how tall is the eiffel tower
- write my homework
- translate this into german
- what day is it today
- buy cheap sneakers
- how do i fix my car
- football scores tonight
- how do i get rid of a cold
- how much is a bitcoin worth
- book a hotel in rome
- sing me a song
- what is the population of china
- how do i knit a scarf
- tips for a first date
- how to become rich
- why is the sky blue
- install windows
- my wifi is slow
- what should i eat tonight
- best phone to buy
- how do i invest in stocks
- dog training tips
- how do i paint a wall
- who invented the telephone
- asdf
- test
- lorem ipsum
- blah blah
- translate good morning into italian
- when was the eiffel tower built
- who won the champions league
- my laptop is broken
- how do i plant flowers
- where can i get a visa
- recipe for apple pie
