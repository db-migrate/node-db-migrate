# Contributing by opening an Issue or Discussing

Whenever you find a bug, which you do not have the time to fix, it is still important
to get your input. Same goes for feature suggestions and everything else that helps
a project to get better.

Here are a few points to consider before creating an issue or discussing within one:

1. Make sure you have proper description of your problem or what exactly you want:

We have issue templates in place that should help you with this one and this is really
important, since we may not just agree with you, if we don't understand your use case.

2. Be constructive and before you post think once more if this is going to waste the maintainers
   time, or if it is going to actually help them.

Since being constructive, is a big vague, here some simple points that should help you:

2.1. Just stating something is wrong, is not constructive.

When you've got the feeling something is wrong, try to understand first if it is really wrong
and if it is make suggestions on how to improve, or even better open a PR and make the open source
world once again even better!

2.2. "Does not work", is not a proper problem description

Neither is, "see title". When you follow the issue template and provide all informations asked for
you should be pretty fine, in providing us exactly the information we need to help you.

2.3. Follow the CoC and contribute, not attack

An example when you're not contributing, but attacking is, should you just impose you're right
and you should be followed. It is always about the dialogue, that makes the difference. After all
you should be fine, by just using your common sense.

# Contributing a Pull Request

Without pull requests from generous people like you, this project
wouldn't be what it is today. You are planning to contribute aren't you?
If so, here's a quick guide to creating a great pull request for
this project:

1. Fork the repo.

2. Copy the test/db.config.example.json to test/db.config.json

3. Run the tests. Pull requests without tests are much less likely to be
   merged, and it's great to know you're starting with a clean slate: `npm test`.
   Be sure to check the README for setting up your test databases first.

4. Add a test for your change. Refactoring and documentation changes
   require no new tests. If you are adding functionality or fixing a bug,
   please include a test.

5. Make the test pass.

6. Create a commit that complies with our conventions, which you can view
   [here](https://github.com/conventional-changelog/conventional-changelog/tree/35e60b5be6027fb2784c5103eee111f6f99b045e/packages/conventional-changelog-angular)
   and last but not least also comply to the [DCO](https://github.com/probot/dco#how-it-works).
   Which easiest work with just commiting via `git commit -s -m 'your commit message'`.

7. Push to your fork and submit a pull request.

At this point you're waiting on me. In a perfect world I'd commit to
responding to your request in some short period of time. Unfortunately,
I'm not able to do that. You'll most likely see me work off several pull
requests in batches. I may suggest some changes or improvements or alternatives
at that time. Please don't consider the feedback as a lack of
appreciation for your time and effort. It most certainly is not.

Some things that will increase the chance that your pull request is accepted,
are:

* Include good tests
* Keep the changeset small
* Stick to existing code conventions
* Update the documentation, examples elsewhere, guides,
  whatever is affected by your contribution

See my [pull request etiquette](http://kunkle.org/blog/2013/07/10/pull-request-etiquette/)
post for more contribution tips.
