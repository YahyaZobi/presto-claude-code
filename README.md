# Presto for Claude Code

A Presto look for Claude Code: Presto colors, the Presto logo, a live status card for each request, and Claude's mascot riding a Presto delivery scooter.

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
- **The Presto mode card** above the prompt: a dark glass card with the Presto logo, drawn from the Presto mode design handoff. It shows:
  - a status pill: **Working**, **Needs your input** (when Claude asks a question or waits for a permission), **Done**, **Failed**, or **Stopped** when you interrupt
  - the request you sent (or the question waiting for you), shortened with an ellipsis when it is long; hover it for the full text
  - how long the request has run and how many steps (tool calls) it took
  - two meters: **Context** (how full the context window is) and **Week** (your weekly limit) with when it resets. They turn amber at 60% and hot red at 85%
- **The rider**: when you send a prompt, Claude's mascot rides a Presto scooter across the bottom of the card. A small rider also sits beside the "working" indicator.

The card updates in place, so its glow and shimmer never restart, and it goes still if your system asks for reduced motion.

## Where it draws

The Code tab of the desktop app, VS Code, and the terminal. The desktop app and VS Code draw the vector card; the terminal draws a pixel rider and plain text lines (it needs about 70 columns for the rider).

## Turning it off

Run `/plugin`, find **presto** under Installed, and disable it. To remove it: `claude plugin uninstall presto@presto-claude-code`.

## Credits

Fonts embedded in the card: [Inter](https://rsms.me/inter/) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/), both under the SIL Open Font License (license files in `hooks/`). Presto name and logo belong to Presto.
