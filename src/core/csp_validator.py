#!/usr/bin/env python3
"""
CSP-0.2: Cognitive Skill Passport Validator (Python Reference)
Conforming to https://github.com/a50kv109/CSP-0.1 (standards/CSP-0.2.md)
"""
import re
from typing import Any, Dict, List, Tuple

CSP_CORE_REGEX = re.compile(r"^(OP|PR|AG|MI)\.(TR|AN|SY|CO)\.(DATA|LANG|SYS|VIS)$")
VALID_NATURES = {"OP", "PR", "AG", "MI"}
VALID_ACTIONS = {"TR", "AN", "SY", "CO"}
VALID_DOMAINS = {"DATA", "LANG", "SYS", "VIS"}
SUPPORTED_VERSIONS = {"0.1", "0.2", "1.0"}


def validate_csp_passport(doc: Any) -> Tuple[bool, List[str]]:
    errors = []
    if not isinstance(doc, dict):
        return False, ["Root document must be a dictionary"]

    p = doc.get("passport")
    if not isinstance(p, dict):
        return False, ["Missing mandatory 'passport' dictionary"]

    core = p.get("core")
    if not isinstance(core, str):
        errors.append("Missing mandatory 'passport.core'")
    else:
        parts = core.strip().split(".")
        if len(parts) != 3:
            errors.append(f"Invalid CORE format: {core}")
        else:
            nature, action, domain = parts
            if nature not in VALID_NATURES:
                errors.append(f"Unknown Nature '{nature}'")
            if action not in VALID_ACTIONS:
                errors.append(f"Unknown Action '{action}'")
            if domain not in VALID_DOMAINS:
                errors.append(f"Unknown Domain '{domain}'")

    desc = p.get("description")
    if not isinstance(desc, str) or not desc.strip():
        errors.append("Missing mandatory 'passport.description'")

    reqs = p.get("requirements")
    if not isinstance(reqs, dict):
        errors.append("Missing mandatory 'passport.requirements'")
    else:
        for k in ("reasoning_depth", "structure", "adaptability"):
            val = reqs.get(k)
            if not isinstance(val, (int, float)) or isinstance(val, bool):
                errors.append(f"Requirement '{k}' must be numeric")
            elif not (0.0 <= float(val) <= 1.0):
                errors.append(f"Requirement '{k}' must be in [0.0, 1.0]")

    meta = p.get("meta")
    if not isinstance(meta, dict):
        errors.append("Missing mandatory 'passport.meta'")
    else:
        ver = meta.get("version")
        if not isinstance(ver, str):
            errors.append("Missing 'passport.meta.version'")
        elif not any(ver == s or ver.startswith(s) for s in SUPPORTED_VERSIONS):
            errors.append(f"Unsupported passport version '{ver}'")

    comp = doc.get("compatibility")
    if comp is not None:
        if not isinstance(comp, dict):
            errors.append("'compatibility' must be a dictionary")
        else:
            for ch_name in ("input", "output"):
                ch_list = comp.get(ch_name)
                if ch_list is not None:
                    if not isinstance(ch_list, list):
                        errors.append(f"'compatibility.{ch_name}' must be a list")
                    else:
                        for idx, item in enumerate(ch_list):
                            if not isinstance(item, dict):
                                errors.append(f"compatibility.{ch_name}[{idx}] must be a dictionary")
                            else:
                                if not item.get("category"):
                                    errors.append(f"compatibility.{ch_name}[{idx}] missing 'category'")
                                fmts = item.get("formats")
                                if not isinstance(fmts, list) or not fmts:
                                    errors.append(f"compatibility.{ch_name}[{idx}] must have non-empty 'formats'")

    return len(errors) == 0, errors
