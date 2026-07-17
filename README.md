# ⚽ Tournament Backoffice

Tournament Backoffice is a tournament management application built with **Google Apps Script** and **Google Sheets**.

The project uses a Google Spreadsheet as its database and provides a Web App interface to manage a football tournament from the group stage to the final.

It supports:

- Tournament and team management
- Automatic group-stage match generation
- Match score management
- Automatic group standings
- Dynamic qualification for knockout stages
- Quarter-finals, semi-finals and final
- Automatic winner propagation through the knockout bracket
- Penalty shootout winners
- Forfeit victories
- Goal scorer registration
- Top scorer ranking
- Fair Play / Respect Challenge points
- Solidarity points
- Dynamic tie-breaking rules

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tournament Formats](#-tournament-formats)
- [Group Stage](#-group-stage)
- [Knockout Stage](#-knockout-stage)
- [Goal Scorers](#-goal-scorers)
- [Fair Play and Solidarity](#-fair-play-and-solidarity)
- [Tie-Breaking Rules](#-tie-breaking-rules)
- [Project Architecture](#-project-architecture)
- [Spreadsheet Structure](#-spreadsheet-structure)
- [Installation](#-installation)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Technologies](#-technologies)
- [Future Improvements](#-future-improvements)

---

# 🏆 Overview

Tournament Backoffice was created to simplify the organization and management of football tournaments.

The application is built entirely on top of the Google ecosystem:

- **Google Sheets** stores tournament data.
- **Google Apps Script** contains the backend and business logic.
- **HTML / CSS / JavaScript** provide the Web App interface.
- `google.script.run` connects the frontend to the Apps Script backend.

The objective is to allow tournament organizers to manage the entire competition from a single interface without requiring a traditional database or external server.

The tournament workflow is:

```text
Tournament creation
        ↓
Team registration
        ↓
Manual group assignment
        ↓
Group match generation
        ↓
Score & scorer registration
        ↓
Automatic standings
        ↓
Qualification
        ↓
Knockout stage generation
        ↓
Quarter-finals / Semi-finals
        ↓
Final
```

---

# ✨ Features

## Tournament selection

The Web App provides a tournament selector allowing organizers to switch between tournaments.

All displayed information is dynamically loaded for the selected tournament.

---

## Automatic group match generation

Matches are automatically generated from the teams assigned to each group.

Each team plays every other team in its group.

The match generation algorithm attempts to distribute matches in a balanced order to avoid teams playing several consecutive games while other teams remain inactive.

---

## Score management

Scores can be entered directly from the Web App.

Once a match has been validated:

- the score is saved;
- the match is marked as played;
- score inputs are disabled;
- standings are automatically recalculated.

Scores cannot be negative.

---

## Forfeit victories

A team can be declared as forfeiting a specific match.

A forfeit automatically records a:

```text
3 - 0
```

victory for the opposing team.

No goal scorers are registered for goals awarded through a forfeit.

---

# 📊 Group Stage

The application automatically calculates standings for every group.

For each team, the following statistics are calculated:

| Statistic | Description |
|---|---|
| Pts | Points |
| J | Matches played |
| G | Wins |
| N | Draws |
| P | Losses |
| BP | Goals scored |
| BC | Goals conceded |
| +/- | Goal difference |
| FP | Fair Play score |

The points system is:

```text
Win  = 3 points
Draw = 1 point
Loss = 0 points
```

Standings are recalculated whenever tournament data is loaded.

---

# 🏟️ Tournament Formats

The application dynamically detects the tournament format based on:

```javascript
{
  groupCount,
  groupSize
}
```

The number of qualified teams determines the knockout structure.

Currently supported formats include:

| Groups | Teams per group | Qualification | Knockout stage |
|---|---:|---|---|
| 3 | 5 | Top 2 + 2 best third-placed teams | QF → SF → Final |
| 3 | 4 | Top 2 + 2 best third-placed teams | QF → SF → Final |
| 2 | 5 | Top 4 from each group | QF → SF → Final |
| 2 | 4 | Top 2 from each group | SF → Final |
| 2 | 3 | Top 2 from each group | SF → Final |

This allows the same application to support tournaments with different numbers of participating teams.

---

# ⚔️ Knockout Stage

Once all group-stage matches have been completed, the knockout stage can be generated.

Depending on the number of qualified teams, the application generates either:

```text
8 qualified teams

Quarter-finals
      ↓
Semi-finals
      ↓
Final
```

or:

```text
4 qualified teams

Semi-finals
      ↓
Final
```

Matches are linked together using:

- `nextMatchId`
- `nextSlot`

When a knockout match is completed, its winner is automatically inserted into the correct position in the next round.

---

## Quarter-final draw

When eight teams qualify, teams are globally ranked based on their group-stage performance.

The top four teams are matched against teams from the bottom four.

When possible, teams from the same group are prevented from facing each other in the quarter-finals.

---

## Direct semi-finals

For formats with four qualified teams, the tournament starts directly from the semi-finals.

Typical pairing:

```text
Group A #1 ─────┐
                ├── Semi-final 1
Group B #2 ─────┘


Group B #1 ─────┐
                ├── Semi-final 2
Group A #2 ─────┘
```

The winners automatically progress to the final.

---

## Penalty shootouts

Knockout matches cannot end in a draw.

If the score is tied after regular play, the interface asks the organizer to select the penalty shootout winner.

Penalty shootout goals are **not** counted as regular match goals and are therefore not registered in the goal scorer statistics.

---

# ⚽ Goal Scorers

When saving a score, the application opens a modal allowing the organizer to register the goal scorers.

For example, for:

```text
Team A 3 - 2 Team B
```

the interface displays:

```text
Team A

Scorer 1
Scorer 2
Scorer 3

Team B

Scorer 1
Scorer 2
```

The registered scorers are stored in the `Goals` sheet.

Goal scorers are also displayed below their respective teams in the match interface.

---

# 🥇 Top Scorer Ranking

The **Stats** tab displays the tournament's top scorer ranking.

Players are primarily ranked by:

```text
Number of goals scored
```

If two players have scored the same number of goals, the progress of their team in the tournament can be used as an additional ranking criterion.

Tournament progression is represented internally using a stage rank:

```text
Group Stage   = 0
Quarter-final = 1
Semi-final    = 2
Final         = 3
Winner        = 4
```

This allows the ranking to evolve dynamically throughout the tournament.

---

# 🤝 Fair Play and Solidarity

The application includes a Fair Play system used as an additional tournament tie-breaker.

Fair Play information is registered when a match result is saved.

## Respect Challenge

The following penalties are supported:

```text
Red card
-3 Fair Play points

Red card for insults / fighting
-6 Fair Play points
```

---

## Solidarity Points

A team can earn a solidarity point by providing a player to help with:

- refereeing;
- tournament organization;
- another requested organizational role.

The organizer selects the team receiving the solidarity point when validating a match.

```text
Solidarity contribution
+1 Fair Play point
```

The Fair Play score is therefore:

```text
Fair Play Score =
Solidarity Points
- (Red Cards × 3)
- (Serious Red Cards × 6)
```

Fair Play events are stored in the `FairPlay` sheet using the team ID.

---

# ⚖️ Tie-Breaking Rules

Teams are ranked using the following criteria:

1. Points
2. Goal difference
3. Goals scored
4. Fair Play score
5. Random draw in case of a complete tie

The same criteria are used when comparing teams from different groups, such as determining the best third-placed teams.

If all sporting and Fair Play criteria are identical, the application performs a random draw.

---

# 🏗️ Project Architecture

The project separates backend business logic from frontend rendering.

## Backend

### `Code.gs`

Main Web App entry point.

Responsible for:

- serving the application;
- HTML template rendering;
- shared Web App functions.

---

### `tournament.gs`

Contains tournament-related business logic.

Responsibilities include:

- loading tournament data;
- computing standings;
- detecting tournament formats;
- determining qualified teams;
- handling qualification rules.

---

### `matchHandler.gs`

Contains match-related logic.

Responsibilities include:

- group-stage match generation;
- score saving;
- forfeit handling;
- knockout-stage generation;
- winner propagation;
- penalty shootout handling.

---

### `individualStats.gs`

Contains individual player statistics logic.

Responsibilities include:

- top scorer calculation;
- scorer ranking;
- team tournament progression ranking.

---

### `fairPlayHandler.gs`

Contains Fair Play-related logic.

Responsibilities include:

- Fair Play data aggregation;
- Respect Challenge penalties;
- solidarity point management;
- Fair Play score calculation.

---

### `spreadsheetInitialization.gs`

Responsible for initializing the Google Spreadsheet structure required by the application.

This allows the project to be installed on a new spreadsheet without manually creating every required sheet and table.

---

### `utils.gs`

Contains shared utility functions used across the backend.

---

# 🎨 Frontend Architecture

The frontend is split into several HTML files to keep responsibilities separated.

### `Index.html`

Main application layout.

Contains:

- tournament selector;
- navigation tabs;
- group-stage container;
- knockout-stage container;
- statistics container;
- goal scorer modal;
- frontend script includes.

---

### `Main.html`

Contains global frontend logic:

- application initialization;
- tournament loading;
- tournament switching;
- tab navigation;
- loading indicator management.

---

### `Matches.html`

Responsible for:

- group match rendering;
- score inputs;
- standings rendering;
- forfeit actions;
- match lookup.

---

### `Bracket.html`

Responsible for:

- knockout bracket rendering;
- knockout-stage generation;
- quarter-final / semi-final / final display.

---

### `Goals.html`

Responsible for:

- goal scorer registration;
- Fair Play input;
- solidarity team selection;
- penalty shootout winner selection;
- match result submission.

---

### `Stats.html`

Responsible for:

- loading individual statistics;
- displaying the top scorer ranking.

---

### `Styles.html`

Contains all application CSS, including:

- match layout;
- standings;
- navigation tabs;
- buttons;
- modals;
- loading spinner;
- knockout bracket layout.

---

# 🗄️ Spreadsheet Structure

The application uses several Google Sheets as its database.

## `Tournaments`

Stores tournaments.

Example columns:

```text
id
name
date
status
```

---

## `Teams`

Stores available teams.

Example columns:

```text
id
name
```

---

## `TournamentTeams`

Associates teams with tournaments and groups.

Example columns:

```text
tournamentId
teamId
group
```

Groups are assigned manually before match generation.

Example:

```text
Tournament 1 | Team 1 | A
Tournament 1 | Team 2 | A
Tournament 1 | Team 3 | B
```

---

## `Matches`

Stores all tournament matches.

Main columns:

```text
id
tournamentId
stage
group
teamA
teamB
scoreA
scoreB
played
nextMatchId
nextSlot
```

Possible stages:

```text
GROUP
QF
SF
FINAL
```

`nextMatchId` and `nextSlot` are used to automatically propagate knockout-stage winners.

---

## `Goals`

Stores registered goal scorers.

The sheet associates each goal with:

- a tournament;
- a match;
- a team;
- a player.

Goal scorer data is used to calculate the individual top scorer ranking.

---

## `FairPlay`

Stores Respect Challenge and Solidarity data.

Columns:

```text
id
tournamentId
matchId
teamId
redCard
seriousRedCard
solidarityPoints
```

Fair Play scores are aggregated by team and used as a tie-breaking criterion.

---

# 🚀 Installation

## 1. Create a Google Spreadsheet

Create a new Google Spreadsheet that will be used as the tournament database.

---

## 2. Open Apps Script

From the spreadsheet:

```text
Extensions
→ Apps Script
```

---

## 3. Add the project files

Copy the `.gs` backend files into the Apps Script project.

Then add the HTML files:

```text
Index.html
Main.html
Matches.html
Bracket.html
Goals.html
Stats.html
Styles.html
```

Make sure the include names used by `Index.html` match the Apps Script HTML file names.

---

## 4. Initialize the spreadsheet

Run the spreadsheet initialization function provided by:

```text
spreadsheetInitialization.gs
```

This creates the required sheets and headers when they do not already exist.

> Existing sheets should not be overwritten.

---

## 5. Add tournament data

Create a tournament in the `Tournaments` sheet.

Then add teams to `Teams`.

Finally, assign teams to groups using `TournamentTeams`.

Example:

```text
tournamentId | teamId | group
1            | 101    | A
1            | 102    | A
1            | 103    | A
1            | 201    | B
1            | 202    | B
1            | 203    | B
```

---

# 📖 Usage

## Step 1 — Select a tournament

Open the Web App and select the tournament from the dropdown.

---

## Step 2 — Generate group matches

Open the **Groupes** tab and click:

```text
Générer les matchs de groupes
```

The application generates all matches based on the groups configured in `TournamentTeams`.

---

## Step 3 — Enter match results

Enter the score for a match and click:

```text
Save Score
```

The match modal allows you to enter:

- goal scorers;
- red cards;
- serious red cards;
- the team receiving a solidarity point;
- the penalty shootout winner when required.

---

## Step 4 — Follow standings

The standings are automatically recalculated based on played matches.

The interface displays:

- points;
- wins;
- draws;
- losses;
- goals scored;
- goals conceded;
- goal difference;
- Fair Play score.

---

## Step 5 — Generate the knockout stage

Once every group-stage match has been completed, open:

```text
Phases finales
```

and generate the final phase.

The application automatically determines whether the tournament should start with:

```text
Quarter-finals
```

or directly with:

```text
Semi-finals
```

based on the number of qualified teams.

---

## Step 6 — Complete the knockout bracket

Enter results for each knockout match.

The winner is automatically propagated to the next match.

For tied knockout matches, select the penalty shootout winner.

Continue until the final is completed.

---

## Step 7 — View individual statistics

Open the:

```text
Stats
```

tab to view the current top scorer ranking.

The ranking can be recalculated throughout the tournament.

---

# 🌐 Deployment

To deploy the application as a Google Apps Script Web App:

1. Open the Apps Script project.
2. Click **Deploy**.
3. Select **New deployment**.
4. Choose **Web app**.
5. Configure the execution permissions.
6. Select who can access the Web App.
7. Deploy.
8. Authorize the required Google permissions.

After deployment, use the generated Web App URL to access the tournament backoffice.

When publishing a new version, create or update the deployment so the latest code is available through the production Web App.

---

# 🛠️ Technologies

- Google Apps Script
- Google Sheets
- JavaScript
- HTML
- CSS
- Google Apps Script HTML Service

No external database or backend server is required.

---

# 🔮 Future Improvements

Possible future improvements include:

- [ ] Additional tournament formats
- [ ] Final standings through several criterias
- [ ] More advanced knockout bracket visualization
- [ ] Team and player management directly from the Web App
- [ ] Automated tests for business logic
- [ ] Exportable tournament reports
- [ ] Tournament administration roles

---

# 🤝 Contributing

Contributions, suggestions and improvements are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Submit a pull request.

Please keep new features consistent with the existing separation between:

- tournament business logic;
- match management;
- statistics;
- Fair Play;
- frontend rendering.