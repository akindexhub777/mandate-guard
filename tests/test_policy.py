"""Unit tests for the deterministic decision policy of MandateGuard.

The LLM verdicts are judged on GenLayer; the policy that turns verdicts into a
decision is plain Python, so it is tested here without any network or SDK.
"""
import ast
import pathlib

import pytest

SRC = pathlib.Path(__file__).parent.parent / "contracts" / "mandate_guard.py"


def _load_decide():
    tree = ast.parse(SRC.read_text())
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "decide")
    ns: dict = {}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), str(SRC), "exec"), ns)
    return ns["decide"]


decide = _load_decide()


def r(verdict: str, over_cap: bool = False) -> dict:
    return {"verdict": verdict, "over_cap": over_cap}


@pytest.mark.parametrize(
    "history, expected",
    [
        ([], "continue"),
        ([r("in_scope"), r("in_scope")], "continue"),
        ([r("borderline")], "warn"),
        ([r("in_scope", True)], "warn"),
        ([r("borderline"), r("borderline")], "escalate"),
        ([r("out_of_scope")], "constrain"),
        ([r("in_scope", True), r("in_scope", True)], "constrain"),
        ([r("out_of_scope"), r("out_of_scope")], "revoke"),
        ([r("out_of_scope", True)], "revoke"),
        ([r("out_of_scope"), r("in_scope", True)], "revoke"),
    ],
)
def test_decide(history, expected):
    assert decide(history) == expected


def test_revoke_is_sticky_once_reached():
    history = [r("out_of_scope"), r("out_of_scope")]
    assert decide(history) == "revoke"
    assert decide(history + [r("in_scope")]) == "revoke"
