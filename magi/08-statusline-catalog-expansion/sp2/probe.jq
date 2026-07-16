# Spike T2.2 (S2) - now injection idiom, jq half.
# Pinned idiom: naive `(env.STATUSLINE_NOW_EPOCH // (now|floor))|tonumber`
# ERRORS (exit 5) when the env var is set to a non-numeric string, because
# `tonumber` on a non-numeric string is a hard jq error, not a falsy value
# that `//` can catch. The safe replacement below guards the tonumber step
# with `?` (suppress-to-empty) so a non-numeric value quietly falls through
# to the same `(now|floor)` fallback used for the "unset" path. Zero shell
# `date` anywhere in this expression -- `now` is jq's builtin gettimeofday.
(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now|floor)
