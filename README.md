# Presto for Claude Code

A Presto look for Claude Code: Presto colors, the Presto logo, and Claude's mascot riding a Presto delivery scooter while it works.

## Install

In a Claude Code terminal session, type:

```
/plugin install presto --marketplace YahyaZobi/presto-claude-code
```

Answer `y` to add the marketplace, then press Enter to install for your user. Or from a shell:

```bash
claude plugin install presto --marketplace YahyaZobi/presto-claude-code
```

In the Claude desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `YahyaZobi/presto-claude-code`, then **Add plugin**.

Restart Claude Code (or open a new session) to see it.

## What it does

- **Presto theme** in the desktop app, light and dark: brand `#FF3000` and the Presto orange ramp.
- **A card above the prompt** with the Presto logo, showing:
  - what Claude is doing right now ("Editing register.tsx", "Running tests", "Searching the code"), or "Done" when it finishes
  - how long the request took, how many files it changed, and how many steps it ran
  - the files it changed
  - your usage: context window, the 5-hour limit and the weekly limit, each with when it resets
- **The rider**: Claude's mascot in a Presto helmet on a red scooter with a Presto box. It rides down a night street while Claude works and parks when it is done. A smaller rider sits beside the "working" indicator.

## Where it draws

The Code tab of the desktop app, VS Code, and the terminal. The desktop app and VS Code draw the vector card; the terminal draws a pixel rider and plain text lines (it needs about 70 columns for the rider).

## Turning it off

Run `/plugin`, find **presto** under Installed, and disable it. To remove it: `claude plugin uninstall presto@presto-claude-code`.
