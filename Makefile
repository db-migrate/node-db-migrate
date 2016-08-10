test:
	@node node_modules/lab/bin/lab new -I verbose,dryRun
test-cov:
	@node node_modules/lab/bin/lab new -t 75 -I verbose,dryRun
test-cov-html:
	@node node_modules/lab/bin/lab new -r html -o coverage.html -I verbose,dryRun

.PHONY: test test-cov test-cov-html
