test:
	@node node_modules/lab/bin/lab -I verbose,dryRun --coverage-exclude lib/interface --coverage-exclude lib/transitions
test-cov:
	@node node_modules/lab/bin/lab -t 66 -I verbose,dryRun --coverage-exclude lib/interface --coverage-exclude lib/transitions
test-cov-html:
	@node node_modules/lab/bin/lab -r html -o coverage.html -I verbose,dryRun --coverage-exclude lib/interface --coverage-exclude lib/transitions

.PHONY: test test-cov test-cov-html
