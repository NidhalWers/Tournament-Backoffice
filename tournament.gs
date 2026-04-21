function getTournaments() {
  const data = getSheetData("Tournaments");
  Logger.log(JSON.stringify(data));

  return data.map(t => ({
    id: String(t.id),
    name: String(t.name),
    status: String(t.status),
    date: t.date ? new Date(t.date).toISOString() : null
  }));
}

function hasMatches(tournamentId) {
  return getSheetData("Matches")
    .some(m => m.tournamentId === tournamentId && m.stage === "GROUP");
}

function isGroupStageComplete(matches) {
  return matches.every(m => m.played === true);
}

function computeStandings(matches, teamMap) {
  const groups = {};

  matches.forEach(m => {
    if (!groups[m.group]) groups[m.group] = {};

    const g = groups[m.group];

    const teamAName = teamMap[m.teamA] || m.teamA;
    const teamBName = teamMap[m.teamB] || m.teamB;

    [teamAName, teamBName].forEach(team => {
      if (!g[team]) {
        g[team] = {
          team,
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          gf: 0,
          ga: 0,
          pts: 0
        };
      }
    });

    if (m.played && m.scoreA !== "" && m.scoreB !== "") {
      const a = parseInt(m.scoreA);
      const b = parseInt(m.scoreB);

      g[teamAName].played++;
      g[teamBName].played++;

      g[teamAName].gf += a;
      g[teamAName].ga += b;

      g[teamBName].gf += b;
      g[teamBName].ga += a;

      if (a > b) {
        g[teamAName].win++;
        g[teamBName].loss++;
        g[teamAName].pts += 3;
      } else if (a < b) {
        g[teamBName].win++;
        g[teamAName].loss++;
        g[teamBName].pts += 3;
      } else {
        g[teamAName].draw++;
        g[teamBName].draw++;
        g[teamAName].pts += 1;
        g[teamBName].pts += 1;
      }
    }
  });

  Object.keys(groups).forEach(group => {
    groups[group] = Object.values(groups[group]).sort((a, b) => {
      return (
        b.pts - a.pts ||
        (b.gf - b.ga) - (a.gf - a.ga) ||
        b.gf - a.gf
      );
    });
  });

  return groups;
}

function getQualifiedTeams(standings) {
  const qualified = [];
  const thirdPlace = [];

  Object.keys(standings).forEach(group => {
    const groupTeams = standings[group];

    // 1er et 2e
    qualified.push({
      ...groupTeams[0],
      group,
      rank: 1
    });

    qualified.push({
      ...groupTeams[1],
      group,
      rank: 2
    });

    // 3e
    if (groupTeams[2]) {
      thirdPlace.push({
        ...groupTeams[2],
        group,
        rank: 3
      });
    }
  });

  let tieBreakOccurred = false;
  // 🔥 tri des meilleurs 3e
  thirdPlace.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;

    const diffA = a.gf - a.ga;
    const diffB = b.gf - b.ga;

    if (diffB !== diffA) return diffB - diffA;

    if (b.gf !== a.gf) return b.gf - a.gf;

    // ⚠️ égalité parfaite → tirage
    tieBreakOccurred = true;
    return Math.random() - 0.5;
  });

  // prendre les 2 meilleurs
  qualified.push(...thirdPlace.slice(0, 2));

  return {
    teams: qualified,
    tieBreakOccurred: tieBreakOccurred
  };
}
