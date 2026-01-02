from typing import List
import sympy as sp

def equation_hint(equation: str) -> List[str]:
    try:
        expr = sp.Eq(*map(sp.sympify, equation.split('=')))
        solution = sp.solve(expr)
        steps = [f"Start with {equation}"]
        steps.append("Subtract the constant term from both sides.")
        steps.append("Divide to isolate the variable.")
        steps.append(f"Solution: x = {solution[0] if solution else ' ?'}")
        return steps
    except Exception:
        return ["Balance both sides.", "Move constants away from x.", "Divide by the coefficient of x."]

def tutor_steps(topic: str, payload) -> List[str]:
    if topic == 'equations' and isinstance(payload, str):
        return equation_hint(payload)
    return ["Break the problem into smaller parts.", "Check units or signs.", "Try a simpler similar example then return."]
