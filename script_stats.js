async function handleFileUpload() {
  try {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (file) {
      const fileContent = await readFileAsync(file);
      const data = JSON.parse(fileContent);

      // Display file details
      displayFileDetails(data);

      // Afficher la timeline avec les données récupérées
      displayTimeline(data);
    } else {
      console.error("No file selected.");
    }
  } catch (error) {
    console.error("Error reading file:", error);
  }
}

async function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      resolve(event.target.result);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsText(file);
  });
}

function displayFileDetails(data) {
  console.log(Object.keys(data.properties));
  const fileDetailsElement = document.getElementById("fileDetails");
  fileDetailsElement.innerHTML = `
                <p><strong>header size:</strong> ${data.header_size}</p>
				<p><strong>Replay Name:</strong> ${data.properties.ReplayName}</p>
            `;
}

function getFramerate(data) {
  return data.properties.RecordFPS;
}

function getMaxFrames(data) {
  return data.properties.NumFrames;
}

function getLastFrameTime(data) {
  if (data.network_frames && data.network_frames.frames.length > 0) {
    const lastFrame =
      data.network_frames.frames[data.network_frames.frames.length - 1];
    return lastFrame.time;
  }
  return null;
}

function getMaxTempsPartie(nbFrames, framerate) {
  const dureeEnSecondes = nbFrames / framerate;
  const dureeEnMinutes = Math.floor(dureeEnSecondes / 60); // Partie entière des minutes
  const dureeEnSecondesRestantes = Math.round(dureeEnSecondes % 60); // Partie en secondes

  return `${dureeEnMinutes} minutes et ${dureeEnSecondesRestantes} secondes`;
}

function getGoals(data) {
  const goals = data.properties.Goals;
  return goals.map((goal) => ({
    frame: goal.frame,
    team: goal.PlayerTeam,
    player: goal.PlayerName,
  }));
}

// Récupère les joueurs et leurs équipes
function getPlayersAndTeams(data) {
  const playerStats = data.properties.PlayerStats;
  const knownPlayerName = data.properties.PlayerName;
  const knownPlayerTeam = playerStats.find(
    (player) => player.Name === knownPlayerName
  ).Team;
  const oppositeTeam = knownPlayerTeam === 0 ? 1 : 0;
  const allPlayers = filterFramesWithReservation(data);

  const playersAndTeams = playerStats.map((player) => ({
    name: player.Name,
    team: player.Team === 0 ? "Blue" : "Orange",
  }));

  allPlayers.forEach((playerName) => {
    if (!playersAndTeams.some((player) => player.name === playerName)) {
      playersAndTeams.push({
        name: playerName,
        team: oppositeTeam === 0 ? "Blue" : "Orange",
      });
    }
  });

  return playersAndTeams;
}

// Récupère la liste des frames qui contiennent un moment fort
function getListeFramesHighlights(data) {
  const highlights = data.properties.HighLights;
  const framesHighlights = highlights.map((highlight) => highlight.frame); // Récupérer les valeurs de la propriété "frame"
  return framesHighlights;
}

// Récupère les indices de toutes les frames qui contiennent un DemolishFx
function findFramesIndicesWithDemolishFx(data) {
  const frames = data.network_frames.frames;
  const framesIndicesWithDemolishFx = frames
    .map((frame, index) => {
      if (frame.updated_actors.some((actor) => actor.attribute && actor.attribute.DemolishFx)) {
        return index;
      }
      return null;
    })
    .filter((index) => index !== null);
  return framesIndicesWithDemolishFx;
}

// Function qui récupère les réservations après la destruction pour tous les joueurs
function getReservationAfterDestroy(data, frameIndicesWithDemolishFx) {
  const frames = data.network_frames.frames;
  const playerTeams = getPlayersAndTeams(data);

  frameIndicesWithDemolishFx.forEach((frameIndex) => {
    const frame = frames[frameIndex];

    
    const filteredActors = frame.updated_actors.filter((actor) => { // Filtrer les acteurs avec Reservation et number: 1
      return actor.attribute && actor.attribute.Reservation && actor.attribute.Reservation.number === 1;
    });

    // Afficher les réservations filtrées
    filteredActors.forEach((filteredActor, actorIndex) => {
      const reservationName = filteredActor.attribute.Reservation.name || "N/A";
      const playerName = reservationName.toLowerCase(); // Assurez-vous que le nom du joueur est en minuscules pour la correspondance
      const playerTeam = playerTeams.find((player) => player.name.toLowerCase() === playerName)?.team || "Unknown";

      console.log(`Frame ${frameIndex}, Actor ${actorIndex}, Reservation Name: ${reservationName}, Player Team: ${playerTeam}`);
    });
  });
}

// Récupère les réservations après la destruction d'un des joueur de l'équipe 0
function getTeam0Destroy(data, frameIndicesWithDemolishFx) {
  const frames = data.network_frames.frames;
  const playerTeams = getPlayersAndTeams(data);
  const destroyedFramesTeam0 = [];

  frameIndicesWithDemolishFx.forEach((frameIndex) => {
    const frame = frames[frameIndex];
    const filteredActors = frame.updated_actors.filter((actor) => { // Filtrer les acteurs avec Reservation et number: 1
      return actor.attribute && actor.attribute.Reservation && actor.attribute.Reservation.number === 1;
    });

    if (filteredActors.some((filteredActor) => { // Vérifier si au moins un acteur dans la frame a "Player Team: Blue"
      const reservationName = filteredActor.attribute.Reservation.name || "N/A";
      const playerName = reservationName.toLowerCase();
      const playerTeam = playerTeams.find((player) => player.name.toLowerCase() === playerName)?.team || "Unknown";

      return playerTeam === "Blue";
    })) {
      destroyedFramesTeam0.push(frameIndex);
    }
  });
  return destroyedFramesTeam0;
}

// Récupère les réservations après la destruction d'un des joueur de l'équipe 1
function getTeam1Destroy(data, frameIndicesWithDemolishFx) {
  const frames = data.network_frames.frames;
  const playerTeams = getPlayersAndTeams(data);
  const destroyedFramesTeam1 = [];

  frameIndicesWithDemolishFx.forEach((frameIndex) => {
    const frame = frames[frameIndex];
    const filteredActors = frame.updated_actors.filter((actor) => { // Filtrer les acteurs avec Reservation et number: 1
      return actor.attribute && actor.attribute.Reservation && actor.attribute.Reservation.number === 1;
    });

    if (filteredActors.some((filteredActor) => { // Vérifier si au moins un acteur dans la frame a "Player Team: Orange"
      const reservationName = filteredActor.attribute.Reservation.name || "N/A";
      const playerName = reservationName.toLowerCase();
      const playerTeam = playerTeams.find((player) => player.name.toLowerCase() === playerName)?.team || "Unknown";
      return playerTeam === "Orange";
    })) {
      destroyedFramesTeam1.push(frameIndex);
    }
  });

  return destroyedFramesTeam1;
}

// Récupère le temps où le joueur a été détruit
function TimesWithDemolishFx(data) {
  const frames = data.network_frames.frames;
  const framesWithDemolishFx = frames
    .filter((frame) => {
      return frame.updated_actors.some((actor) => {
        return actor.attribute && actor.attribute.DemolishFx;
      });
    })
    .map((frame) => frame.time);
  console.log("Temps ou a lieu une DemolishFx:", framesWithDemolishFx);
  return framesWithDemolishFx;
}


// Récupère les noms des joueurs de la partie, qui ont une réservation
function filterFramesWithReservation(data) {
  const frames = data.network_frames.frames;
  const namesWithReservation = new Set();
  frames.forEach((frame) => {
    frame.updated_actors.forEach((actor) => {
      if (actor.attribute && actor.attribute.Reservation) {
        namesWithReservation.add(actor.attribute.Reservation.name);
      }
    });
  });
  return Array.from(namesWithReservation);
}

// Récupère les saves de la partie, avec l'équipe et la frame
function getSaves(data) {
  const saves = [];
  if (data.tick_marks) {
    data.tick_marks.forEach((tick_mark) => {
      if (
        tick_mark.description === "Team0Goal" ||
        tick_mark.description === "Team1Goal"
      ) {
        saves.push(tick_mark);
      }
    });
  }
  return saves;
}

// Récupère les saves de l'équipe 0
function getTeam0Saves(data) {
  const team0Saves = [];
  if (data.tick_marks) {
    data.tick_marks.forEach((tick_mark) => {
      if (tick_mark.description === "Team0Save") {
        team0Saves.push(tick_mark);
      }
    });
  }
  return team0Saves;
}

// Récupère les saves de l'équipe 1
function getTeam1Saves(data) {
  const team1Saves = [];
  if (data.tick_marks) {
    data.tick_marks.forEach((tick_mark) => {
      if (tick_mark.description === "Team1Save") {
        team1Saves.push(tick_mark);
      }
    });
  }
  return team1Saves;
}

function prepareDataForTimeline(saves, team) {
  return saves.map((save) => ({
    time: save.frame,
    event: save.description,
    team: team,
  }));
}

// Affiche la timeline
function displayTimeline(data) {
  const maxFrames = getMaxFrames(data);
  const framerate = getFramerate(data);

  const maxDuration = getMaxTempsPartie(maxFrames, framerate);

  var margin = { left: 100 };
  var width = 960 - margin.left;
  var height = 500;


  const maxMinutes = maxFrames / framerate / 60; 
  const xScale = d3.scaleLinear().domain([0, maxMinutes]).range([0, width]);

  // Supprime l'ancienne timeline
  d3.select("#timeline").selectAll("*").remove();

  d3.select("#timeline")
  .classed("timeline-hidden", false)
  .style("display", "block");

  // Création du conteneur SVG
  const svg = d3.select("#timeline").append("svg")
    .attr("width", width + margin.left)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + margin.left + ",0)");

  // Ajouter un rectangle pour chaque équipe
  svg
    .append("rect").attr("x", 0).attr("y", height / 4 - 5)
    .attr("width", width)
    .attr("height", 18)
    .attr("fill", "blue");

  svg
    .append("rect").attr("x", 0).attr("y", height / 3 - 5)
    .attr("width", width)
    .attr("height", 18)
    .attr("fill", "orange");

  // Ajout du texte pour chaque équipe
  svg
    .append("text").attr("x", -10).attr("y", height / 4).attr("text-anchor", "end").
    text("Equipe Bleue").
    attr("fill", "blue").
    attr("font-size", "13px");

  svg
    .append("text").attr("x", -10).attr("y", height / 3).attr("text-anchor", "end")
    .text("Equipe Orange")
    .attr("fill", "orange")
    .attr("font-size", "13px");

  svg.append("text").attr("x", width / 2).attr("y", height / 2 - 10)
    .text(`La partie à durée : ${maxDuration}`)
    .attr("font-size", "12px")
    .style("dominant-baseline", "hanging");

  /*
  Partie 1: Les goals
  */

  const goals = getGoals(data);
  goals.forEach((goal) => {
    const x = xScale(goal.frame / framerate / 60);

    svg
      .append("image")
      .attr("xlink:href", "img/goal_icon.png")
      .attr("x", x)
      .attr("y", goal.team === 0 ? height / 4.75 : height / 3.3)
      .attr("width", 35)
      .on("mouseover", function () {
        const time = (goal.frame / framerate).toFixed(2);
        d3.select(this).append("title").text(`Goal by ${goal.player} at ${time} seconds`);
      });

  });

  /*
  Partie 2: Les saves
  */

  const team0Saves = getTeam0Saves(data);
  const team1Saves = getTeam1Saves(data);

  const timelineDataTeam0 = prepareDataForTimeline(team0Saves, "Team 0");
  const timelineDataTeam1 = prepareDataForTimeline(team1Saves, "Team 1");

  timelineDataTeam0.forEach((save) => {
    const x = xScale(save.time / framerate / 60);
  
    svg
      .append("image")
      .attr("xlink:href", "img/save_icon.png")
      .attr("x", x)
      .attr("y", height / 4.75)
      .attr("width", 35)
      .attr("height", 35)
      .on("mouseover", function () {
        const time = (save.time / framerate).toFixed(2);
        d3.select(this).append("title").text(`Save by ${save.team} at ${time} seconds`);
      });
  });
  
  timelineDataTeam1.forEach((save) => {
    const x = xScale(save.time / framerate / 60);
  
    svg
      .append("image")
      .attr("xlink:href", "img/save_icon.png")
      .attr("x", x)
      .attr("y", height / 3.3)
      .attr("width", 35)
      .attr("height", 35)
      .on("mouseover", function () {
        const time = (save.time / framerate).toFixed(2);
        d3.select(this).append("title").text(`Save by ${save.team} at ${time} seconds`);
      });
  });

  /*
  Partie 3: Les demolitions
  */

  const frameIndicesWithDemolishFx = findFramesIndicesWithDemolishFx(data);
  let demolitionDataTeam0 = getTeam0Destroy(data, frameIndicesWithDemolishFx);
  let demolitionDataTeam1 = getTeam1Destroy(data, frameIndicesWithDemolishFx);


  demolitionDataTeam0.forEach((frameIndex) => {
    const x = xScale(frameIndex / framerate / 60);
  
    svg
      .append("image")
      .attr("xlink:href", "img/demolition_icon.png")
      .attr("x", x)
      .attr("y", height / 4)
      .attr("width", 20)
      .attr("height", 20)
      .on("mouseover", function () {
        const time = (frameIndex / framerate).toFixed(2);
        d3.select(this).append("title").text(`Blue player demolished at ${time} seconds`);
      });
  });
  
  demolitionDataTeam1.forEach((frameIndex) => {
    const x = xScale(frameIndex / framerate / 60);
  
    svg
      .append("image")
      .attr("xlink:href", "img/demolition_icon.png")
      .attr("x", x)
      .attr("y", height / 3)
      .attr("width", 20)
      .attr("height", 20)
      .on("mouseover", function () {
        const time = (frameIndex / framerate).toFixed(2);
        d3.select(this).append("title").text(`Orange player demolished at ${time} seconds`);
      });
  });

  /*
  Partie 4: La légende
  */
  const legendData = [
    { icon: "img/goal_icon.png", description: "But" },
    { icon: "img/save_icon.png", description: "Sauvegarde" },
    { icon: "img/demolition_icon.png", description: "Joueur détruit" },
  ];

  const legendContainer = d3.select("#legend");
  legendContainer.selectAll("*").remove();

  legendContainer
    .selectAll("div")
    .data(legendData)
    .enter()
    .append("div")
    .html((d) => `<img src="${d.icon}" alt="${d.description}" width="20" height="20"> ${d.description}`)
    .style("margin-right", "20px");
}

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);
  
  document.getElementById("uploadButton").addEventListener("click", function () {

d3.select("#timeline").classed("timeline-hidden", true).style("display", "none");
handleFileUpload();

});
  