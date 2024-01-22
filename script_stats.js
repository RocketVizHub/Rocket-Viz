const COL_GREEN = "#098149"; //#21A38B;
const COL_BLUE = "#307fe2";
const COL_ORANGE = "#e87722";
const COL_START = "#ffffff";
const COL_END = "#e87722";

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);

document
  .getElementById("replay1")
  .addEventListener("click", function() {
    readExemple("https://raw.githubusercontent.com/RocketVizHub/Rocket-Viz/main/utils/replay03.json");
  });

document
  .getElementById("replay2")
  .addEventListener("click", function() {
    readExemple("https://raw.githubusercontent.com/RocketVizHub/Rocket-Viz/main/utils/replay04.json");
  });

async function readExemple(path) {
  console.log(path);
  try {
    const fileContent = await fetch(path);
    const data = await fileContent.json();

    displayAccordionsNReplayInformations();

    // Display file details
    displayFileDetails(data);

    // Afficher la timeline avec les données récupérées
    displayTimeline(data);

    // Display & Debug axel
    document.getElementById("ball_heatmap_buttons").innerHTML = "";
    displayNDebugAxel(data);

    // sonia
    document.getElementById("playerStatsContent").innerHTML = "";
    document.getElementById("content").innerHTML = "";
    document.getElementById("pressure").innerHTML = "";
    displayPlayerStats(data);
  } catch (error) {
    console.error("Error reading file:", error);
  }
}


async function handleFileUpload() {
  try {
    const fileInput = document.getElementById("fileInput");
    console.log(fileInput.files);
    const file = fileInput.files[0];
    if (file) {
      const fileContent = await readFileAsync(file);
      const data = JSON.parse(fileContent);

      displayAccordionsNReplayInformations();

      // Display file details
      displayFileDetails(data);

      // Afficher la timeline avec les données récupérées
      displayTimeline(data);

      // Display & Debug axel
      document.getElementById("ball_heatmap_buttons").innerHTML = "";
      displayNDebugAxel(data);

      // sonia
      document.getElementById("playerStatsContent").innerHTML = "";
      document.getElementById("content").innerHTML = "";
      document.getElementById("pressure").innerHTML = "";
      displayPlayerStats(data);
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

function displayAccordionsNReplayInformations() {
  d3.select(".fileDetails")
    .style("display", "block");
  
  d3.select(".accordion")
    .style("display", "block");
}

function displayFileDetails(data) {
  console.log(Object.keys(data.properties));
  list_frame_demo = findFramesIndicesWithDemolishFx(data);
  console.log(getReservationAfterDestroy(data, list_frame_demo));
  console.log(getMaxFrames(data));
  console.log(getMaxTempsPartie(getMaxFrames(data), getFramerate(data)));
  console.log(getListeFramesHighlights(data));
  // console.log(getListFramesGoals(data));
  // const fileDetailsElement = document.getElementById("fileDetails");
  // fileDetailsElement.innerHTML = `
  //               <p><strong>header size:</strong> ${data.header_size}</p>
	// 			<p><strong>Replay Name:</strong> ${data.properties.ReplayName}</p>
  //           `;
  d3.select("#fileDetails").selectAll("*").remove();
  d3.select("#fileDetails")
    .append("p")
    .html(`<strong>Replay Name:</strong> ${data.properties.ReplayName}`);
  d3.select("#fileDetails")
    .append("p")
    .html(`<strong>Map playes:</strong> ${data.properties.MapName}`);
  d3.select("#fileDetails")
    .append("p")
    .html(`<strong>Date:</strong> ${data.properties.Date}`);
  d3.select("#fileDetails")
    .append("p")
    .html(`<strong>Saved by:</strong> ${data.properties.PlayerName}`);
}

/******************************* Partie Axel ********************************/

function displayDebugAxel(data) {
  console.log("--- AXEL IS DEBUGGING ---");

  debugClassIndices(data);
  console.log(getCarsIds(data));
  ballLocations = getLocations(data, 0);
  console.log(ballLocations);
  minMaxLocations = getMinMaxLocations(ballLocations);
  console.log(minMaxLocations);
  ratioXY =
    (minMaxLocations.xMax - minMaxLocations.xMin) /
    (minMaxLocations.yMax - minMaxLocations.yMin);
  xSize = 70;
  ySize = Math.round(xSize * ratioXY);
  heatmap = locationsToHeatmap(ballLocations, xSize, ySize);
  console.log(heatmap);

  heatmap = thresholdHeatmap(heatmap);

  const width = 350;
  const height = 350 * ratioXY;
  displayHeatmap(heatmap, {
    width: width,
    height: height,
    container: "#ball_heatmap",
    // start_color: "#FC7C89",
    start_color: COL_START,
    end_color: COL_END,
  });

  console.log("--- DEBUGGED ---");
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
    team: player.Team === 0 ? "COL_BLUE" : "Orange",
  }));

  allPlayers.forEach((playerName) => {
    if (!playersAndTeams.some((player) => player.name === playerName)) {
      playersAndTeams.push({
        name: playerName,
        team: oppositeTeam === 0 ? "COL_BLUE" : "Orange",
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
      if (
        frame.updated_actors.some(
          (actor) => actor.attribute && actor.attribute.DemolishFx
        )
      ) {
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

    const filteredActors = frame.updated_actors.filter((actor) => {
      // Filtrer les acteurs avec Reservation et number: 1
      return (
        actor.attribute &&
        actor.attribute.Reservation &&
        actor.attribute.Reservation.number === 1
      );
    });

    // Afficher les réservations filtrées
    filteredActors.forEach((filteredActor, actorIndex) => {
      const reservationName = filteredActor.attribute.Reservation.name || "N/A";
      const playerName = reservationName.toLowerCase(); // Assurez-vous que le nom du joueur est en minuscules pour la correspondance
      const playerTeam =
        playerTeams.find((player) => player.name.toLowerCase() === playerName)
          ?.team || "Unknown";

      console.log(
        `Frame ${frameIndex}, Actor ${actorIndex}, Reservation Name: ${reservationName}, Player Team: ${playerTeam}`
      );
    });
  });
}

function getTeam0Destroy(data, frameIndicesWithDemolishFx) {
  const frames = data.network_frames.frames;
  const playerTeams = getPlayersAndTeams(data);
  const destroyedFramesTeam0 = [];

  frameIndicesWithDemolishFx.forEach((frameIndex) => {
    const frame = frames[frameIndex];
    const filteredActors = frame.updated_actors.filter((actor) => {
      return (
        actor.attribute &&
        actor.attribute.Reservation &&
        actor.attribute.Reservation.number === 1
      );
    });

    filteredActors.forEach((filteredActor) => {
      const reservationName = filteredActor.attribute.Reservation.name || "N/A";
      const playerName = reservationName.toLowerCase();
      const playerTeam =
        playerTeams.find((player) => player.name.toLowerCase() === playerName)
          ?.team || "Unknown";

      if (playerTeam === "COL_BLUE") {
        destroyedFramesTeam0.push({ frameIndex, playerName });
      }
    });
  });

  return destroyedFramesTeam0;
}

function getTeam1Destroy(data, frameIndicesWithDemolishFx) {
  const frames = data.network_frames.frames;
  const playerTeams = getPlayersAndTeams(data);
  const destroyedFramesTeam1 = [];

  frameIndicesWithDemolishFx.forEach((frameIndex) => {
    const frame = frames[frameIndex];
    const filteredActors = frame.updated_actors.filter((actor) => {
      return (
        actor.attribute &&
        actor.attribute.Reservation &&
        actor.attribute.Reservation.number === 1
      );
    });

    filteredActors.forEach((filteredActor) => {
      const reservationName = filteredActor.attribute.Reservation.name || "N/A";
      const playerName = reservationName.toLowerCase();
      const playerTeam =
        playerTeams.find((player) => player.name.toLowerCase() === playerName)
          ?.team || "Unknown";

      if (playerTeam === "Orange") {
        destroyedFramesTeam1.push({ frameIndex, playerName });
      }
    });
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

let filteredDemolitions = [];
let filteredSavesTeam0 = [];
let filteredSavesTeam1 = [];
let filteredGoals = [];

// Affiche la timeline
function displayTimeline(data, startTime, endTime) {
  const maxFrames = getMaxFrames(data);
  const framerate = getFramerate(data);

  const maxDuration = getMaxTempsPartie(maxFrames, framerate);

  var margin = { left: 100 };
  var width = 960 - margin.left;
  var height = 500;

  let maxMinutes;
  if (startTime !== undefined && endTime !== undefined) {
    maxMinutes = endTime - startTime;
  } else {
    maxMinutes = maxFrames / framerate / 60;
  }
  const xScale = d3.scaleLinear().domain([0, maxMinutes]).range([0, width]);

  // Supprime l'ancienne timeline
  d3.select("#timeline").selectAll("*").remove();

  d3.select("#timeline")
    .classed("timeline-hidden", false)
    .style("display", "block");

  // Création du conteneur SVG
  const svg = d3
    .select("#timeline")
    .append("svg")
    .attr("width", width + margin.left)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + margin.left + ",0)");

  // Ajouter un rectangle pour chaque équipe
  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", height / 4 - 5)
    .attr("width", width)
    .attr("height", 18)
    .attr("fill", COL_BLUE);

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", height / 3 - 5)
    .attr("width", width)
    .attr("height", 18)
    .attr("fill", COL_ORANGE);

  // Ajout du texte pour chaque équipe
  svg
    .append("text")
    .attr("x", -10)
    .attr("y", height / 4 + 10)
    .attr("text-anchor", "end") 
    .text("Blue Team")
    .attr("fill", COL_BLUE)
    .attr("font-size", "14px");

  svg
    .append("text")
    .attr("x", -10)
    .attr("y", height / 3 + 10)
    .attr("text-anchor", "end")
    .text("Orange Team")
    .attr("fill", COL_ORANGE)
    .attr("font-size", "14px");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 - 10)
    .text(`The game lasted ${maxDuration}`)
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
        d3.select(this)
          .append("title")
          .text(`Goal by ${goal.player} at ${time} seconds`);
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
        d3.select(this)
          .append("title")
          .text(`Save by ${save.team} at ${time} seconds`);
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
        d3.select(this)
          .append("title")
          .text(`Save by ${save.team} at ${time} seconds`);
      });
  });

  /*
  Partie 3: Les demolitions
  */

  const frameIndicesWithDemolishFx = findFramesIndicesWithDemolishFx(data);
  let demolitionDataTeam0 = getTeam0Destroy(data, frameIndicesWithDemolishFx);
  let demolitionDataTeam1 = getTeam1Destroy(data, frameIndicesWithDemolishFx);

  demolitionDataTeam0.forEach(({ frameIndex, playerName }) => {
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
        d3.select(this)
          .append("title")
          .text(`${playerName} demolished at ${time} seconds`);
      });
  });

  demolitionDataTeam1.forEach(({ frameIndex, playerName }) => {
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
        d3.select(this)
          .append("title")
          .text(`${playerName} demolished at ${time} seconds`);
      });
  });

  /*
  Partie 4: La légende
  */
  const legendData = [
    { icon: "img/goal_icon.png", description: "Goal" },
    { icon: "img/save_icon.png", description: "Save" },
    { icon: "img/demolition_icon.png", description: "Destroyed player (joueur détruit)" },
  ];

  const legendContainer = d3.select("#legend");
  legendContainer.selectAll("*").remove();

  legendContainer
    .selectAll("div")
    .data(legendData)
    .enter()
    .append("div")
    .html(
      (d) =>
        `<img src="${d.icon}" alt="${d.description}" width="20" height="20"> ${d.description}`
    )
    .style("margin-right", "20px");

/*
 Partie 5: Sélection de la partition de la timeline à afficher
*/

function displayUpdateTimeline() {
  try {
    const startTime = Number(document.getElementById("startTime").value);
    const endTime = Number(document.getElementById("endTime").value);

    const filteredData = getFilteredData(data, startTime, endTime);

    d3.select("#timeline").selectAll("*").remove();
    displayTimeline(filteredData, startTime, endTime);
  } catch (error) {
    console.error("Error updating timeline:", error);
  }
}

document.getElementById("updateTimeline").addEventListener("click", displayUpdateTimeline);

}


function getFilteredData(data, startTime, endTime) {
  const framerate = getFramerate(data);
  const startSeconds = Number(startTime) * 60;
  const endSeconds = Number(endTime) * 60;

  // Filtrer les frames
  const frames = data.network_frames.frames.filter(frame => {
    return frame.time >= startSeconds && frame.time <= endSeconds;
  });

  // Partie 1: Filtrer les buts
  const goals = getGoals(data);
  // Filtrer les buts qui sont dans la partition de la timeline
  const filteredGoals = goals.filter(goal => {
    return goal.frame / framerate >= startSeconds && goal.frame / framerate <= endSeconds;
  });

  // Partie 2: Filtrer les démolitions
  const frameIndicesWithDemolishFx = findFramesIndicesWithDemolishFx(data);
  const demolitionDataTeam0 = getTeam0Destroy(data, frameIndicesWithDemolishFx).filter(({ frameIndex }) => frameIndex / framerate >= startSeconds && frameIndex / framerate <= endSeconds);
  const demolitionDataTeam1 = getTeam1Destroy(data, frameIndicesWithDemolishFx).filter(({ frameIndex }) => frameIndex / framerate >= startSeconds && frameIndex / framerate <= endSeconds);

  // Partie 3: Filtrer les sauvegardes
  const team0Saves = getTeam0Saves(data);
  const filteredSavesTeam0 = team0Saves.filter(save => {
    return save.frame / framerate >= startSeconds && save.frame / framerate <= endSeconds;
  });

  const team1Saves = getTeam1Saves(data);
  const filteredSavesTeam1 = team1Saves.filter(save => {
    return save.frame / framerate >= startSeconds && save.frame / framerate <= endSeconds;
  });

  return {
    ...data,
    network_frames: {
      ...data.network_frames,
      frames: frames
    },
    goals: filteredGoals,
    demolitionDataTeam0: demolitionDataTeam0,
    demolitionDataTeam1: demolitionDataTeam1,
    team0Saves: filteredSavesTeam0,
    team1Saves: filteredSavesTeam1,
  };
}

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);

document.getElementById("uploadButton").addEventListener("click", function () {
  d3.select("#timeline")
    .classed("timeline-hidden", true)
    .style("display", "none");
  handleFileUpload();
});

/** Partie Axel **/
function displayNDebugAxel(data) {
  console.log("--- AXEL IS DEBUGGING ---");

  debugClassIndices(data);
  ballTimeNActorId = getBallTimeNActorId(data);
  console.log(ballTimeNActorId);
  ballLocations = getBallLocations(data, ballTimeNActorId, 0, -1);
  console.log(ballLocations);

  // ballLocations = getLocations(data, 0);
  // console.log(ballLocations);
  minMaxLocations = getMinMaxLocations(ballLocations);
  console.log(minMaxLocations);
  ratioXY =
    (minMaxLocations.xMax - minMaxLocations.xMin) /
    (minMaxLocations.yMax - minMaxLocations.yMin);
  xSize = 70;
  ySize = Math.round(xSize * ratioXY);
  heatmap = locationsToHeatmap(ballLocations, xSize, ySize);
  console.log(heatmap);

  heatmap = thresholdHeatmap(heatmap);

  const width = 450;
  const height = 450 * ratioXY;
  displayHeatmap(heatmap, {
    width: width,
    height: height,
    container: "#ball_heatmap",
    // start_color: "#FC7C89",
    start_color: COL_START,
    end_color: COL_END,
  });

  scoreData = getScore(data);
  console.log(scoreData);
  winner =
    scoreData[scoreData.length - 1].score.Blue >
    scoreData[scoreData.length - 1].score.Orange
      ? "Blue"
      : "Orange";

  for (var i = 0; i < ballTimeNActorId.length; i++) {
    createButtons(
      i,
      i === 0
        ? "0-0"
        : "" +
            scoreData[i - 1].score.Blue +
            "-" +
            scoreData[i - 1].score.Orange,
      i === scoreData.length ? winner : scoreData[i].scoredBy,
      "ball_heatmap_buttons",
      data,
      ballTimeNActorId[i][0],
      ballTimeNActorId[i + 1] ? ballTimeNActorId[i + 1][0] : -1,
      width,
      height,
      xSize,
      ySize
    );
  }

  console.log("--- DEBUGGED ---");
}

function getScore(data) {
  const goals = getGoals(data);
  const score = { Blue: 0, Orange: 0 };
  const scoreList = [];

  goals.forEach((goal) => {
    if (goal.team === 0) {
      score.Blue++;
    } else if (goal.team === 1) {
      score.Orange++;
    }

    scoreList.push({
      // Ajoute le score actuel à la liste à chaque but
      score: {
        Blue: score.Blue,
        Orange: score.Orange,
      },
      scoredBy: goal.team === 0 ? "Blue" : "Orange",
    });
  });

  return scoreList;
}

function createButtons(
  id,
  text,
  team,
  containerId,
  data,
  start,
  end,
  width,
  height,
  xSize,
  ySize
) {
  var btn = document.createElement("button");

  btn.id = "#ball_heatmap_buttons" + id;
  btn.className = "btn mt-3";
  btn.innerText = text;
  btn.style.borderRadius = "0";

  blueColor = "#307fe2";
  orangeColor = "#e87722";
  lightBlueColor = "#6b9ddb";
  lightOrangeColor = "#de9f6f";
  if (team === "Blue") {
    color = blueColor;
    lightColor = lightBlueColor;
  } else if (team === "Orange") {
    color = orangeColor;
    lightColor = lightOrangeColor;
  }

  btn.style.backgroundColor = color;
  btn.style.borderColor = color;

  btn.onclick = function () {
    refreshHeatmap(data, start, end, width, height, xSize, ySize);
    var buttons = document.querySelectorAll("#ball_heatmap_buttons");
    for (var i = 0; i < buttons.length; i++) {
      var button = document.getElementById("#ball_heatmap_buttons" + i);
      button.style.backgroundColor = lightColor;
      button.style.borderColor = lightColor;
    }
    btn.style.backgroundColor = color;
    btn.style.borderColor = color;
  };

  document.getElementById(containerId).appendChild(btn);
}

function refreshHeatmap(data, start, end, width, height, xSize, ySize) {
  console.log("refreshing heatmap");
  console.log(start);
  console.log(end);

  ballTimeNActorId = getBallTimeNActorId(data);
  ballLocations = getBallLocations(data, ballTimeNActorId, start, end);
  heatmap = locationsToHeatmap(ballLocations, xSize, ySize);
  console.log(heatmap);

  heatmap = thresholdHeatmap(heatmap);
  displayHeatmap(heatmap, {
    width: width,
    height: height,
    container: "#ball_heatmap",
    // start_color: "#FC7C89",
    start_color: COL_START,
    end_color: COL_END,
  });
}

/**
 * Logs the class indices of the given data.
 * @param {Object} data - The data object.
 */
function debugClassIndices(data) {
  console.log(data.class_indices);
}

/**
 * Retrieves the stream IDs of cars from the given data.
 * @param {Object} data - The data object containing class indices and net cache.
 * @returns {Array} - An array of stream IDs.
 */
function getCarsIds(data) {
  const class_indices = data.class_indices;
  const index = class_indices.filter(
    (class_index) => class_index.class === "TAGame.RBActor_TA"
  )[0].index;

  const net_cache = data.net_cache;
  const indices = net_cache.filter((obj) => obj.object_ind === index)[0]
    .properties;
  const stream_ids = new Array();
  indices.forEach((obj) => stream_ids.push(obj.stream_id));
  return stream_ids;
}

/**
 * Retrieves the time and actor ID for each frame where the ball is at location (0, 0) and is sleeping.
 * @param {Object} data - The data object containing network frames.
 * @returns {Array} - An array of arrays, where each inner array contains the frame time and actor ID.
 */
function getBallTimeNActorId(data) {
  const frames = data.network_frames.frames;
  const ballTimeNActorId = new Array();
  frames.forEach((frame) => {
    frame.updated_actors.forEach((actor) => {
      if (
        actor.attribute &&
        actor.attribute.RigidBody &&
        actor.attribute.RigidBody.sleeping === true &&
        actor.attribute.RigidBody.location &&
        actor.attribute.RigidBody.location.x === 0 &&
        actor.attribute.RigidBody.location.y === 0
      ) {
        ballTimeNActorId.push([frame.time, actor.actor_id]);
      }
    });
  });
  return ballTimeNActorId;
}

/**
 * Retrieves the locations of a ball from the given data within a specified time range.
 * If endTime is -1, all frames after startTime will be considered.
 * For each frame, the actor in ballTimeNActorId with the corresponding time will be picked.
 *
 * @param {object} data - The data containing network frames.
 * @param {object} ballTimeNActorId - The ball time and actor ID mapping.
 * @param {number} startTime - The start time of the desired time range.
 * @param {number} endTime - The end time of the desired time range. Use -1 to consider all frames after startTime.
 * @returns {Array} - An array of ball locations, each containing the time and location coordinates.
 */
function getBallLocations(data, ballTimeNActorId, startTime, endTime) {
  /*
  if endTime is -1, we will take all the frames after startTime
  for each frame we will pick the actor in ballTimeNActorId with the corresponding time
  */
  // console.log(ballTimeNActorId);
  const frames = data.network_frames.frames;
  const locations = new Array();
  frames.forEach((frame) => {
    if (frame.time >= startTime && (frame.time <= endTime || endTime === -1)) {
      // check what actor_id we need to use
      ballActorId = findBallActorId(ballTimeNActorId, frame.time);
      // console.log(ballActorId);

      frame.updated_actors.forEach((actor) => {
        if (
          actor.actor_id === ballActorId &&
          actor.attribute &&
          actor.attribute.RigidBody &&
          actor.attribute.RigidBody.location
        ) {
          // console.log(actor.attribute.RigidBody.location);
          locations.push([frame.time, actor.attribute.RigidBody.location]);
        }
      });
    }
  });
  return locations;
}

/**
 * Finds the actor ID associated with a given time in an array of ball time and actor ID pairs.
 * @param {Array<Array<number|string>>} ballTimeNActorId - The array of ball time and actor ID pairs.
 * @param {number} time - The time to search for.
 * @returns {number|string} - The actor ID associated with the given time.
 */
function findBallActorId(ballTimeNActorId, time) {
  for (let i = 0; i < ballTimeNActorId.length - 1; i++) {
    if (ballTimeNActorId[i + 1][0] > time) {
      // console.log(ballTimeNActorId[i][1]);
      return ballTimeNActorId[i][1];
    }
  }
  return ballTimeNActorId[ballTimeNActorId.length - 1][1];
}

/**
 * Retrieves the locations of a specific actor from the given data.
 * @param {Object} data - The data containing network frames.
 * @param {string} actor_id - The ID of the actor to retrieve locations for.
 * @returns {Array} - An array of locations, each containing the frame time and actor location.
 */
function getLocations(data, actor_id) {
  const frames = data.network_frames.frames;
  const locations = new Array();
  frames.forEach((frame) => {
    frame.updated_actors.forEach((actor) => {
      // if (actor.attribute && actor.attribute.Reservation) {
      //   namesWithReservation.add(actor.attribute.Reservation.name);
      // }
      if (
        actor.actor_id === actor_id &&
        actor.attribute &&
        actor.attribute.RigidBody &&
        actor.attribute.RigidBody.location
      ) {
        // console.log(actor.attribute.RigidBody.location);
        locations.push([frame.time, actor.attribute.RigidBody.location]);
      }
    });
  });
  return locations;
}

/**
 * Calculates the minimum and maximum values for each coordinate (x, y, z) in the given locations array.
 * @param {Array} locations - An array of locations, where each location is an array containing a name and an object with x, y, and z coordinates.
 * @returns {Object} - An object containing the minimum and maximum values for each coordinate (xMin, xMax, yMin, yMax, zMin, zMax).
 */
function getMinMaxLocations(locations) {
  let xMin = 0;
  let xMax = 0;
  let yMin = 0;
  let yMax = 0;
  let zMin = 0;
  let zMax = 0;

  locations.forEach((location) => {
    const x = location[1].x;
    const y = location[1].y;
    const z = location[1].z;

    if (x < xMin) {
      xMin = x;
    } else if (x > xMax) {
      xMax = x;
    }

    if (y < yMin) {
      yMin = y;
    } else if (y > yMax) {
      yMax = y;
    }

    if (z < zMin) {
      zMin = z;
    } else if (z > zMax) {
      zMax = z;
    }
  });

  return {
    xMin: xMin,
    xMax: xMax,
    yMin: yMin,
    yMax: yMax,
    zMin: zMin,
    zMax: zMax,
  };
}

/**
 * Translates the locations by subtracting the minimum values of each coordinate axis.
 * @param {Array} locations - The array of locations to be translated.
 * @returns {Array} - The translated locations.
 */
function translateLocations(locations) {
  const minMaxLocations = getMinMaxLocations(locations);
  const translatedLocations = new Array();
  locations.forEach((location) => {
    const x = location[1].x;
    const y = location[1].y;
    const z = location[1].z;

    const translatedX = x - minMaxLocations.xMin;
    const translatedY = y - minMaxLocations.yMin;
    const translatedZ = z - minMaxLocations.zMin;

    translatedLocations.push([
      location[0],
      { x: translatedX, y: translatedY, z: translatedZ },
    ]);
  });
  return translatedLocations;
}

/**
 * Returns a 2D array representing the heatmap based on the given locations.
 * The first dimension represents the x-axis, and the second dimension represents the y-axis.
 * The function divides the field into xSize * ySize squares and counts the number of times the ball was in each square.
 * @param {Array} locations - An array of locations, where each location is an array containing the time it was captured and an object with x, y, and z coordinates.
 * @param {number} xSize - The number of squares on the x-axis.
 * @param {number} ySize - The number of squares on the y-axis.
 * @returns {Array} - A 2D array representing the heatmap.
 */
function locationsToHeatmap(locations, xSize, ySize) {
  /*
    Returns a 2d-array of the heatmap, the first dimension is the x-axis, the second is the y-axis.
    We will devide the field in 1000x1000 squares, and count the number of times the ball was in each square.
    param: locations - An array of locations, where each location is an array containing the time it has been captured and an object with x, y, and z coordinates.

    we will add 1 to the corresponding square every 0.02 seconds
  */
  let heatmap = new Array(ySize);
  for (let i = 0; i < heatmap.length; i++) {
    heatmap[i] = new Array(xSize);
    for (let j = 0; j < heatmap[i].length; j++) {
      heatmap[i][j] = 0;
    }
  }

  locations = translateLocations(locations);

  const minMaxLocations = getMinMaxLocations(locations);

  locations.forEach((location) => {
    const x = location[1].x;
    const y = location[1].y;

    let xIndex = Math.floor(
      ((x - minMaxLocations.xMin) /
        (minMaxLocations.xMax - minMaxLocations.xMin)) *
        xSize
    );
    let yIndex = Math.floor(
      ((y - minMaxLocations.yMin) /
        (minMaxLocations.yMax - minMaxLocations.yMin)) *
        ySize
    );
    if (xIndex < 0) {
      xIndex = 0;
    } else if (xIndex > xSize - 1) {
      xIndex = xSize - 1;
    }
    if (yIndex < 0) {
      yIndex = 0;
    } else if (yIndex > ySize - 1) {
      yIndex = ySize - 1;
    }

    // heatmap[xIndex][yIndex] += 1;
    // we want to add 1 to the corresponding square every 0.02 seconds
    const time = location[0];
    // get the next time if we are not at the end of the array
    const nextTime =
      locations.indexOf(location) < locations.length - 1
        ? locations[locations.indexOf(location) + 1][0]
        : time + 0.02;
    const timeDifference = nextTime - time;
    const numberOfIterations = Math.floor(timeDifference / 0.02);
    heatmap[yIndex][xIndex] += numberOfIterations;
  });
  return heatmap;
}

/**
 * Lower the outliers in a heatmap by setting values above the 95th percentile to the threshold value.
 *
 * @param {number[][]} heatmap - The heatmap to be thresholded.
 * @returns {number[][]} - The thresholded heatmap.
 */
function thresholdHeatmap(heatmap) {
  /*
    Make a histogram of the heatmap, and lower the outliers
    Use the quantile function to get the 95th percentile
  */
  let histogram = new Array();
  for (let i = 0; i < heatmap.length; i++) {
    for (let j = 0; j < heatmap[i].length; j++) {
      histogram.push(heatmap[i][j]);
    }
  }
  histogram.sort((a, b) => a - b);
  const threshold = d3.quantile(histogram, 0.95);
  for (let i = 0; i < heatmap.length; i++) {
    for (let j = 0; j < heatmap[i].length; j++) {
      if (heatmap[i][j] > threshold) {
        heatmap[i][j] = threshold;
      }
    }
  }
  return heatmap;
}

/**
 * Displays a heatmap based on the provided data and options.
 *
 * @param {Array<Array<number>>} data - The data for the heatmap.
 * @param {Object} options - The options for configuring the heatmap.
 * @param {string} options.container - The container element for the heatmap.
 * @param {string} options.start_color - The starting color for the heatmap.
 * @param {string} options.end_color - The ending color for the heatmap.
 */
function displayHeatmap(data, options) {
  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  // const margin = { top: 50, right: 50, bottom: 180, left: 180 };
  const width = options.width;
  const height = options.height;
  const container = options.container;
  const startColor = options.start_color;
  const endColor = options.end_color;

  // Find our max and min values
  const maxValue = d3.max(data, (layer) => {
    return d3.max(layer, (d) => {
      return d;
    });
  });
  const minValue = d3.min(data, (layer) => {
    return d3.min(layer, (d) => {
      return d;
    });
  });
  const numrows = data.length;
  // assume all subarrays have same length
  const numcols = data[0].length;

  // remove the old svg if it exists
  d3.select(container).select("svg").remove();

  // Create the SVG container
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // // Add a background to the SVG
  // const background = svg
  //   .append("rect")
  //   .style("stroke", "black")
  //   .attr("width", width)
  //   .attr("height", height);

  svg.append("svg:image")
    .attr("xlink:href", "./img/map3.png") // Remplacez par le chemin de votre image
    .attr("width", width);
    // .style("opacity", 0.8);
    // .attr("filter", "url(#brightness)")
  // Build some scales for us to use
  const x = d3.scale.ordinal().domain(d3.range(numcols)).rangeBands([0, width]);
  const y = d3.scale
    .ordinal()
    .domain(d3.range(numrows))
    .rangeBands([0, height]);

  // scale our colors from the start
  // color to the end color.
  const colorMap = d3.scale
    .linear()
    .domain([minValue, maxValue])
    .range([startColor, endColor]);

  // Generate rows and columns and add
  // color fills.
  const row = svg
    .selectAll(".row")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "row")
    .attr("transform", (d, i) => {
      return "translate(0," + y(i) + ")";
    });

  const cell = row
    .selectAll(".cell")
    .data((d) => {
      return d;
    })
    .enter()
    .append("g")
    .attr("class", "cell")
    .attr("transform", (d, i) => {
      return "translate(" + x(i) + ", 0)";
    });

  cell
    .append("rect")
    .attr("width", x.rangeBand() + 0.5)
    .attr("height", y.rangeBand() + 0.5);
  // .attr("width", x.rangeBand()-0.3) if we want the borders

  row
    .selectAll(".cell")
    .data((d, i) => {
      return data[i];
    })
    .style("fill", colorMap)
    .style("opacity", 0.5);
}

/******************************* Partie Nicolas ********************************/

function getFramerate(data) {
  return data.properties.RecordFPS;
}

function getMaxFrames(data) {
  return data.properties.NumFrames; // récupère le nombre de frame max
}

function getMaxTempsPartie(nbFrames, framerate) {
  const dureeEnSecondes = nbFrames / framerate;
  const dureeEnMinutes = Math.floor(dureeEnSecondes / 60); // Partie entière des minutes
  const dureeEnSecondesRestantes = Math.round(dureeEnSecondes % 60); // Partie en secondes

  return `${dureeEnMinutes} minutes and ${dureeEnSecondesRestantes} seconds`;
}

function getListeFramesHighlights(data) {
  const highlights = data.properties.HighLights; // Récupérer la liste des moments forts
  const framesHighlights = highlights.map((highlight) => highlight.frame); // Récupérer les valeurs de la propriété "frame"
  return framesHighlights;
}

function getPlayerNamesGoal(data) {
  const goals = data.properties.Goals;
  const playerNames = goals.map((goal) => goal.PlayerName);
  return playerNames;
}

function getFramesGoal(data) {
  const goals = data.properties.Goals;
  const frames = goals.map((goal) => goal.frame);
  return frames;
}

function getAllGoalInformation(data) {
  const goals = data.properties.Goals;
  const goalInformation = goals.map((goal) => {
    return {
      PlayerName: goal.PlayerName,
      frame: goal.frame,
    };
  });
  return goalInformation;
}

/******************************* Partie Sonia ********************************/

/**
 * Énumération permettant la sélection du groupe de personne
 * auquel on veut comparer un joueur dans l'histogramme.
 */
const SelectEnum = {
	AllPlayers: "All Players",
	Team: "Team",
	Enemies: "Enemies",
	OnePlayer: "One Player"
};

/**
 * Récupère les statistiques des joueurs.
 * @param {*} data
 * @returns
 */
function getPlayerStats(data) {
  return data.properties.PlayerStats;
}

/**
 * Récupère les statistiques utiles à la création de l'overview par équipe :
 * - Score
 * - Goals
 * - Assists
 * - Saves
 * - Shots
 * @param {Array} team0 tableau des joueurs de l'équipe 0
 * @param {Array} team1 tableau des joueurs de l'équipe 1
 * @returns
 */
function getTeamStats(team0, team1) {
  const getStatsTotal = (team) => team.reduce((acc, player) => {
    acc.goals += player.Goals;
    acc.assists += player.Assists;
    acc.saves += player.Saves;
    acc.shots += player.Shots;
    acc.score += player.Score;
    return acc;
  }, { goals: 0, assists: 0, saves: 0, shots: 0, score: 0 });

  const statsTeam0 = getStatsTotal(team0);
  const statsTeam1 = getStatsTotal(team1);

  const map = new Map();

  map.set("Score", { [team0[0].Team]: statsTeam0.score, [team1[0].Team]: statsTeam1.score });
  map.set("Goals", { [team0[0].Team]: statsTeam0.goals, [team1[0].Team]: statsTeam1.goals });
  map.set("Assists", { [team0[0].Team]: statsTeam0.assists, [team1[0].Team]: statsTeam1.assists });
  map.set("Saves", { [team0[0].Team]: statsTeam0.saves, [team1[0].Team]: statsTeam1.saves });
  map.set("Shots", { [team0[0].Team]: statsTeam0.shots, [team1[0].Team]: statsTeam1.shots });

  return map;
}

/**
 * Récupère les statisques permettant de faire l'affichage de l'overview par équipe.
 * @param {*} data
 * @returns
 */
function getOverviewStats(data) {
  const player = getPlayerStats(data);
  const playerTeam0 = player.filter((player) => player.Team === 0);
  const playerTeam1 = player.filter((player) => player.Team === 1);

  let overviewInformation = new Map();

  overviewInformation = getTeamStats(playerTeam0, playerTeam1);

  //return la fusion des deux objets
  return overviewInformation;
}

/**
 * Affiachge global des statistiques des joueurs : tableau des scores, overview par équipe, pression.
 * @param {Array} data
 */
function displayPlayerStats(data) {
  var scoreTeam0;
  var scoreTeam1;

  if (typeof data.properties.Team0Score === "undefined") scoreTeam0 = 0;
  else scoreTeam0 = data.properties.Team0Score;
  if (typeof data.properties.Team1Score === "undefined") scoreTeam1 = 0;
  else scoreTeam1 = data.properties.Team1Score;

  var team0Stats = data.properties.PlayerStats.filter(
    (player) => player.Team === 0
  );
  var team1Stats = data.properties.PlayerStats.filter(
    (player) => player.Team === 1
  );

  // Add element at the beginning of the array, that is the team score
  team0Stats.unshift(scoreTeam0);
  team1Stats.unshift(scoreTeam1);
  var teamsStats = [team0Stats, team1Stats];

  displayScoreBoard(teamsStats, scoreTeam0, scoreTeam1);

  var overviewStats = getOverviewStats(data);

  var width = d3.select("body").node().getBoundingClientRect().width;

  d3.selectAll("#content").append("h1").text("Team Statistics");
  displayOverviewStats(overviewStats);

  var locationBall = getLocations(data, 0);

  var sumXneg = 0;
  var sumXpos = 0;

  // La largeur du terrain est y (-5 200 => 5 200)
  locationBall.forEach((location) => {
    if (location[1].y < 0) {
      sumXneg++;
    } else if (location[1].y > 0) {
      sumXpos++;
    }
  });

  var data_ball = [
    { team: "Team1", count: sumXneg },
    { team: "Team2", count: sumXpos },
  ];

  // d3.selectAll("#content").append("h1").text("Pressure");
  d3.selectAll("#pressure")
    .append("p")
    .text("Pressure is a measure of how much time the ball spends on a side.");
  displayPressure(data_ball, sumXneg, sumXpos);
}

/**
 * Calcule la moyenne des résultats des autres adversaires pour le Score, les Goals,
 * les Assists, les Shots et les Saves.
 * @param {Map} teamsStats tableau contenant les statistiques des joueurs.
 * @param {Map} selectedPlayer joueur sélectionné.
 * @param {String} playerName nom du joueur sélectionné.
 * @param {Enum} selectedOpponent tous les autres joueurs / team / team adverse.
 * @returns {Map} contenant la moyenne des Score, Goals, Assists, Saves et Shots des joueurs
 * autres que le joueur sélectionné.
 */
function calculateMeanStats(teamsStats, selectedPlayer, playerName, selectedOpponent) {
  var allStats = teamsStats.flat().filter(player => player.Name !== playerName);
  var team = teamsStats.flat().filter(player => player.Name === playerName)[0].Team;
  var totalCount = 0;
  var meanStats = allStats.reduce(function (acc, player) {
    for (var key in player) {
      if (typeof selectedPlayer[key] !== "undefined") {
        if (selectedOpponent === SelectEnum.AllPlayers
          || (selectedOpponent === SelectEnum.Team && player.Team === team)
          || (selectedOpponent === SelectEnum.Enemies && player.Team !== team)) {
          acc[key] = (acc[key] || 0) + player[key];
          if (key === "Score") totalCount++;
        }
      }
    }
    return acc;
  }, {});

  for (var key in meanStats) {
    meanStats[key] /= totalCount;
  }

  return meanStats;
}

/**
 * Réarrange des données dans l'ordre suivant : Score, Goals, Assists, Saves, Shots.
 * @param {Map} selectedPlayer joueur sélectionné. 
 * @returns {Map} joueur sélectionné avec les données réarrangées.
 */
function rearrangeOrder(selectedPlayer) {  
  var order = ['Score', 'Goals', 'Assists', 'Saves', 'Shots'];
  var rearrangedPlayer = new Map();
  order.forEach(function (key) {
      if (selectedPlayer.hasOwnProperty(key)) {
          rearrangedPlayer.set(key, selectedPlayer[key]);
      }
  });
  return rearrangedPlayer;
}

/**
 * Affichage de l'histogramme de comparaison des statistiques d'un joueur avec
 * les autres joueurs de la partie.
 * @param {Map} teamsStats tableau contenant les statistiques de tous les joueurs.
 * @param {Map} selectedPlayer joueur sélectionné.
 * @returns 
 */
function handleRowSelection(teamsStats, selectedPlayer) {
  // Clear existing bar chart
  d3.select("#barChart").selectAll("*").remove();
  d3.select("#barChartSelect").selectAll("*").remove();

  var playerName = selectedPlayer.Name;

  var textPlayerName = playerName + "'s statistics : ";

  d3.select("#barChartSelect").append("p").text(textPlayerName);

  // Sélectionnez l'élément où vous souhaitez ajouter le sélecteur (par exemple, le body du document)
  var body = d3.select("#barChartSelect");

  // Ajoutez le label et le sélecteur
  var selectorContainer = body.append("div");

  selectorContainer
    .append("label")
    .attr("for", "confrontSelect")
    .text("Confront : ")
    .style("margin-right", "10px");

  var confrontSelect = selectorContainer
    .append("select")
    .attr("id", "confrontSelect");

  // Ajoutez les options au sélecteur
  var options = Object.values(SelectEnum);

  confrontSelect
    .selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .attr("value", function(d) { return d; })
    .text(function(d) { return d; });

  var meanStats = rearrangeOrder(calculateMeanStats(teamsStats, selectedPlayer, playerName, SelectEnum.AllPlayers));

  // Ajoutez une fonction pour gérer les changements dans le sélecteur
  confrontSelect.on("change", function () {
    // Remove the "Select a player:" text and the player selection dropdown
    d3.select("#playerSelectLabel").remove();
    d3.select("#playerSelect").remove();

    // Obtenez la valeur sélectionnée
    var selectedOption = confrontSelect.property("value");
    
    if (selectedOption === SelectEnum.OnePlayer) {
      // Supprimez la liste déroulante existante si elle existe déjà
      d3.select("#playerSelectLabel").remove();
      d3.select("#playerSelect").remove();

      // Créez une nouvelle sélection pour les joueurs
      var playerSelectContainer = body.append("div");

      playerSelectContainer
        .append("label")
        .attr("id", "playerSelectLabel")
        .attr("for", "playerSelect")
        .text("Select a player: ")
        .style("margin-right", "10px");;

      var playerSelect = playerSelectContainer
        .append("select")
        .attr("id", "playerSelect");

      // Ajoutez les options des noms des joueurs à la nouvelle liste déroulante
      var playerOptions = teamsStats.flatMap(team => team.map(player => player.Name));

      playerSelect
        .selectAll("option")
        .data(playerOptions)
        .enter()
        .append("option")
        .attr("value", function(d) { 
          return d; 
        })
        .text(function(d) { return d; });

      playerSelect.on("change", function () {
        var selectedPlayerName = playerSelect.property("value");
        var stats = teamsStats.flat().filter(player => player.Name === selectedPlayerName);
        meanStats = rearrangeOrder(stats[0]);
        drawHistogram(teamsStats, selectedPlayer, meanStats, selectedPlayerName);
      });
    } else {
      drawHistogram(teamsStats, selectedPlayer, selectedOption);
    }
  });

  drawHistogram(teamsStats, selectedPlayer, SelectEnum.AllPlayers);
}

/**
 * Affiche l'histogramme à droite du tableau de score.
 * @param {Map} teamsStats contient les informations de tous les joueurs.
 * @param {Map} selectedPlayer contient les informations du joueur sélectionné.
 * @param {Enum} selectedOption Confrontation à la moyenne de tous les ennemis,
 * de tous les alliés ou de tous les joueurs.
 * @returns 
 */
function drawHistogram(teamsStats, selectedPlayer, selectedOption, oppenentName = null) {
  // Clear existing bar chart
  d3.select("#barChart").selectAll("*").remove();

  var playerName = selectedPlayer.Name;
  var playerTeam = selectedPlayer.Team;

  var meanStats;

  if (typeof selectedOption !== "object")
    meanStats = rearrangeOrder(calculateMeanStats(teamsStats, selectedPlayer, playerName, selectedOption));
  else {
    meanStats = selectedOption;
  }
 
  var rearrangedPlayer = rearrangeOrder(selectedPlayer);

  var barWidth = 20;
  var widthDelta = 10;
  var width = rearrangedPlayer.size * (2 * barWidth + widthDelta);
  var height = 400;
  // Create a bar chart
  var svg = d3.select("#barChart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("display", "block")
    .style("margin-top", "10px");

  var teamMax = new Map();

  teamsStats.forEach(team => {
    team.forEach(member => {
      for (const [key, value] of Object.entries(member)) {
        if (key != "Name" && key !== "OnlineID" && key !== "Team" && key !== "Platform" && key !== "bBot") {
          if (teamMax.has(key)) {
            if (teamMax.get(key) < value)
              teamMax.set(key, value);
          } else {
            teamMax.set(key, value);
          }
        }
      }
    });
  });

  var bars = svg.selectAll("#barChart")
    .data(rearrangedPlayer)
    .enter()
    .append("rect")
    .attr("class", "barChart")
    .attr("x", function (d, i) {
      return 2 * i * barWidth + widthDelta * i; 
    })
    .attr("y", function (d) {
      return width - width * d[1] / teamMax.get(d[0]);
    })
    .attr("width", barWidth)
    .attr("height", function (d) {
      return 2 + width * d[1] / teamMax.get(d[0]); 
    })
    .attr("fill", function (d) {
      if (playerTeam == 0) {
        return COL_BLUE;
      } else {
        return COL_ORANGE;
      }
    });

    var text = svg.selectAll("text")
      .data(rearrangedPlayer)
      .enter()
      .append("text")
      .text(function(d) {
        return d[0];
      })
      .attr("y", function (d) {
        // return 250;
        return width + 15;
      })
      .attr("x", function (d, i) {
        return 2 * i * barWidth + widthDelta * i; 
      })
      .attr("font-size", "15px");
  
    bars.on("mouseover", function(e, d) {
      d3.select(this).style("opacity", "0.8").text;
        var xPosition = parseFloat(d3.select(this).attr("x")) + 15;
        if (d[1] != 0) var yPosition = parseFloat(d3.select(this).attr("y")) + 10;
        else var yPosition = parseFloat(d3.select(this).attr("y")) - 15;
    
        // Rotate the text
        var resultText = svg
            .append("text")
            .text(d[1])
            .attr("x", xPosition)
            .attr("y", yPosition)
            .attr("class", "result-text")
            .attr("text-anchor", "end") 
            .attr("alignment-baseline", "ideographic") 
            .attr("transform", "rotate(-90 " + xPosition + " " + yPosition + ")")
            .style("color", "white");
    });

    bars.on("mouseout", function() {
      d3.select(this).style("opacity", "1");
      svg.select(".result-text").remove();
    })
  
  var bars2 = svg.selectAll("#barChart2")
    .data(meanStats)
    .enter()
    .append("rect")
    .attr("class", "barChart2")
    .attr("x", function (d, i) {
      return 2 * i * barWidth + barWidth + widthDelta * i; 
    })
    .attr("y", function (d) {
      return width - width * d[1] / teamMax.get(d[0]);
    })
    .attr("width", barWidth)
    .attr("height", function (d) {
      return 2 + width * d[1] / teamMax.get(d[0]); 
    })
    .attr("fill", "grey");
  
    bars2.on("mouseover", function(e, d) {
      d3.select(this).style("opacity", "0.8").text;
      var xPosition = parseFloat(d3.select(this).attr("x")) + 15;
      if (d[1] != 0) var yPosition = parseFloat(d3.select(this).attr("y")) + 10;
      else var yPosition = parseFloat(d3.select(this).attr("y")) - 15;
  
      // Rotate the text
      var resultText = svg
          .append("text")
          .text(Math.round(d[1] * 100) / 100)
          .attr("x", xPosition)
          .attr("y", yPosition)
          .attr("class", "result-text")
          .attr("text-anchor", "end") 
          .attr("alignment-baseline", "ideographic") 
          .attr("transform", "rotate(-90 " + xPosition + " " + yPosition + ")")
          .style("color", "white");
    });

    bars2.on("mouseout", function() {
      d3.select(this).style("opacity", "1");
      svg.select(".result-text").remove();
    })
  
  
 //------------------------------- Légende -------------------------------
  const legend = svg.append("g");

  const rectWidth = 20;

  if (typeof selectedOption === "object") {
    selectedOption = SelectEnum.OnePlayer;
  }

  const dataLegend = [playerName, selectedOption];

  legend.selectAll("rect")
    .data(dataLegend)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", function (d, i) {  
      return i * rectWidth + width + 30;
    })
    .attr("width", rectWidth)
    .attr("height", rectWidth)
    .attr("fill", function(d) {
      if (d === playerName) {
        if (playerTeam === 0) {
          return COL_BLUE;
        } else {
          return COL_ORANGE;
        }
      } else {
        return "grey";
      }
    });

  legend
    .selectAll("text")
    .data(dataLegend)
    .enter()
    .append("text")
    .attr("x", rectWidth * 1.5)
    .attr("y", (d, i) => i * rectWidth + rectWidth * 0.75 + width + 30)
    .text(function (d, i) {
      if (oppenentName === null || i === 0) return d;
      else return oppenentName;
    });


  return svg.node();
}

/**
 * Trouve le meilleur joueur de la game.
 * @param {Map} teamsStats 
 * @returns le nom du meilleur joueur de la partie.
 */
function findMVP(teamsStats) {
  var bestPlayerName;
  var bestPlayerScore = 0;
  teamsStats.forEach(team => {
    team.forEach(member => {
      if (member.Score > bestPlayerScore) {
        bestPlayerName = member.Name;
        bestPlayerScore = member.Score;
      }
    });
  });
  return bestPlayerName;
}

/**
 * Affiche le tableau des scores.
 * @param {Array} teamsStats
 * @param {Integer} scoreTeam0
 * @param {Integer} scoreTeam1
 */
function displayScoreBoard(teamsStats, scoreTeam0, scoreTeam1) {
  var rows = d3
    .select("#playerStatsTable")
    .select("tbody")
    .selectAll("tr")
    .data(teamsStats)
    .enter();

  var rows2 = rows
    .selectAll("tr")
    .data(function (d) {
      // joins inner array of each row
      return d;
    })
    .enter()
    .append("tr")
    .on("mouseover", function (e, d) {
      // d3.select(this).style("font-weight", "bold");
      if (d.Team === 0) {
        d3.select(this).style("color", COL_BLUE);
      } else {
        d3.select(this).style("color", COL_ORANGE);
      }
    })
    .on("mouseout", function (e, d) {
      //put the text in normal
      d3.select(this).style("font", null).style("color", null);
    })
    .on("click", function (e, d) {
      if (typeof d !== "number")
        handleRowSelection(teamsStats, d);
    });

  var bestPlayerName = findMVP(teamsStats);

  rows2.append("td").text(function (d) {
    if (typeof d === "number" && Number.isInteger(d)) {
      d3.select(this)
        .classed("special-column", true)
        .attr("colspan", 6)
        .style("font-weight", "bold")
        .classed("text-light", true)
        .classed("team1", d === scoreTeam0)
        .classed("team2", d === scoreTeam1)
        .classed("score", true)
        .style("padding", "3px")
        .style("background-color", function (d) {
          if (d === scoreTeam0) {
            return COL_BLUE;
          } else {
            return COL_ORANGE;
          }
        }
      );
      if (d == scoreTeam0)
        // var text = "🏁 " + d;
        var text = "🏳  " + d;
      else 
        var text = "🏳 " + d;
      return text;
    } else {
      d3.select(this).classed("name", true);
      if (d.Name == bestPlayerName) {
        text = "♛ "+ d.Name;
        d3.select(this).style("font-weight", "bold");
      } else {
        text = d.Name;
      }
      return text;
    }
  });

  rows2.each(function (d) {
    if (typeof d.Score !== "undefined") {
      d3.select(this).append("td").text(d.Score);
    }
  });
  rows2.each(function (d) {
    if (typeof d.Goals !== "undefined") {
      d3.select(this).append("td").text(d.Goals);
    }
  });
  rows2.each(function (d) {
    if (typeof d.Assists !== "undefined") {
      d3.select(this).append("td").text(d.Assists);
    }
  });
  rows2.each(function (d) {
    if (typeof d.Saves !== "undefined") {
      d3.select(this).append("td").text(d.Saves);
    }
  });
  rows2.each(function (d) {
    if (typeof d.Shots !== "undefined") {
      d3.select(this).append("td").text(d.Shots);
    }
  });
}

/**
 * Affiche les statistique de confrontation entre les deux équipes.
 * @param {Map} overviewStats
 */
function displayOverviewStats(overviewStats) {
  var widthDelta = 125;
  var centrageVertical = 30;
  var svg = d3.select("#content")
    .append("svg")
    .attr("width", 1000)
    .attr("height", 300);

  var width = 1000; // Ajout de la variable width pour référence

  // Rectangle pour les stats du joueur 1
  var rectanglesPlayer1 = svg.selectAll(".team1")
    .data(overviewStats)
    .enter()
    .append("rect")
    .attr("class", "team1")
    .attr("y", function (d, i) {
      return i * 50;
    })
    .attr("x", widthDelta)
    .attr("width", function (d) {
      var sum = d[1][0] + d[1][1];
      return (d[1][0] / sum) * (width - widthDelta);
    })
    .attr("height", 50)
    .attr("fill", function (d) {
      return d[1][0] * 10;
    });

  var texts = svg.selectAll("text").data(overviewStats).enter();

  var textTeam1 = texts
    .append("text")
    .attr("class", "text-team-results")
    .text(function (d) {
      return d[1][0]; // Valeur de la team 1
    })
    .attr("y", function (d, i) {
      return i * 50 + centrageVertical; // Ajuster pour le centrage vertical
    })
    .attr("x", widthDelta + 15);

  rectanglesPlayer1.on("mouseover", function (e, d) {
    var rect = d3.select(this).classed("hovered", true);

    var rectWidth = parseFloat(d3.select(this).attr("width"));

    var percentage = (d[1][0] / (d[1][0] + d[1][1])) * 100;
    percentage = Math.round(percentage * 100) / 100;
    var percentageText = svg
      .append("text")
      .text(percentage + "%")
      .attr("x", parseFloat(d3.select(this).attr("x")) + rectWidth - 10)
      .attr("y", parseFloat(d3.select(this).attr("y")) + centrageVertical)
      .attr("class", "percentage-text").attr("text-anchor", "end");
  });
  rectanglesPlayer1.on("mouseout", function (e, d) {
    var rect = d3.select(this);

    // Supprimer la classe pour le survol
    rect.classed("hovered", false);
    // Supprimer le texte pour le pourcentage
    svg.select(".percentage-text").remove();
  });

  // Rectangle pour les stats du joueur 2
  var rectanglesPlayer2 = svg
    .selectAll(".team2")
    .data(overviewStats)
    .enter()
    .append("rect")
    .attr("class", "team2")
    .attr("y", function (d, i) {
      return i * 50;
    })
    .attr("x", function (d) {
      var sum = d[1][0] + d[1][1];
      return width - (d[1][1] / sum) * (width - widthDelta);
    })
    .attr("width", function (d) {
      var sum = d[1][0] + d[1][1];
      return (d[1][1] / sum) * (width - widthDelta);
    })
    .attr("height", 50)
    .attr("fill", function (d) {
      return d[1][1] * 10;
    });
  var textTeam2 = texts
    .append("text")
    .attr("class", "text-team-results")
    .text(function (d) {
      if (d[1][1] !== 0)
        return d[1][1]; // Valeur de la team 1
      return "";
    })
    .attr("y", function (d, i) {
      return i * 50 + centrageVertical; // Ajuster pour le centrage vertical
    })
    .attr("x", width - 15)
    .attr("text-anchor", "end");
  rectanglesPlayer2.on("mouseover", function (e, d) {
    var rect = d3.select(this).classed("hovered", true);
    var percentage = (d[1][1] / (d[1][0] + d[1][1])) * 100;
    percentage = Math.round(percentage * 100) / 100;
    var percentageText = svg
      .append("text")
      .text(percentage + "%")
      .attr("x", parseFloat(d3.select(this).attr("x")) + 10)
      .attr("y", parseFloat(d3.select(this).attr("y")) + centrageVertical)
      .attr("class", "percentage-text");
  });
  rectanglesPlayer2.on("mouseout", function (e, d) {
    var rect = d3.select(this);
    rect.classed("hovered", false);
    svg.select(".percentage-text").remove();
  });

  // Texte pour les noms des joueurs
  var textRowName = texts
    .append("text")
    .text(function (d) {
      return d[0];
    })
    .attr("y", function (d, i) {
      return i * 50 + centrageVertical;
    })
    .attr("x", 50)
    .attr("class", "text-row-name");
}

/**
 * Diagramme circulaire la pression (c'est-à-dire le temps que passe la balle dans chaque camp).
 * @param {Map} data_ball : positions de la balle au cours de la partie.
 * @param {Integer} sumXneg : nombre de fois que la balle est du côté de l'équipe 0.
 * @param {Integer} sumXpos : nombre de fois que la balle est du côté de l'équipe 1.
 * @returns
 */
function displayPressure(data_ball, sumXneg, sumXpos) {
  getPieData = d3.pie().value(function (d) {
    return d.count;
  });
  var pieData = getPieData(data_ball);
  const width = 600;
  const height = 400;

  const svg = d3
    .select("#pressure")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const arcCreator = d3
    .arc()
    .innerRadius(0)
    .outerRadius(height / 2);

  const pie = svg
    .append("g")
    .attr("transform", `translate(${height / 2}, ${height / 2})`);

  pie
    .selectAll("path")
    .data(pieData)
    .enter()
    .append("path")
    .attr("d", arcCreator) 
    .attr("fill", (d) => ({ Team1: COL_BLUE, Team2: COL_ORANGE }[d.data.team]))

    .on("mouseover", (event, d) => {
      d3.select(`.text-${d.data.team}`).attr("opacity", 1);
      d3.select(event.target).attr("opacity", 0.8);
    })
    .on("mouseout", (event, d) => {
      d3.select(`.text-${d.data.team}`).attr("opacity", 0);
      d3.select(event.target).attr("opacity", 1);
    });

 //------------------------------- Pourcentage -------------------------------
  pie
    .selectAll("text")
    .data(pieData)
    .enter()
    .append("text")
    .attr("class", (d) => `text-${d.data.team}`)
    .attr("transform", (d) => `translate(${arcCreator.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("opacity", 0)
    .text(function (d) {
      var percentage = (d.data.count / (sumXneg + sumXpos)) * 100;
      percentage = Math.round(percentage * 100) / 100;
      return percentage + "%";
    });

 //------------------------------- Légende -------------------------------
  const legend = svg.append("g").attr("transform", `translate(${height - 10})`);

  const rectWidth = 20;

  legend
    .selectAll("rect")
    .data(pieData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * rectWidth)
    .attr("width", rectWidth)
    .attr("height", rectWidth)
    .attr("fill", (d) => ({ Team1: COL_BLUE, Team2: COL_ORANGE }[d.data.team]));

  legend
    .selectAll("text")
    .data(pieData)
    .enter()
    .append("text")
    .attr("x", rectWidth * 1.5)
    .attr("y", (d, i) => i * rectWidth + rectWidth * 0.75)
    .text((d) => d.data.team);

  return svg.node();
}

/** 
 * Fonction pour charger un fichier JSON
 * @param filePath nom du fichier.
 */
function loadJsonFile(filePath) {
  return new Promise((resolve, reject) => {
    d3.json(filePath)
      .then((data) => resolve({ filePath, data }))
      .catch((error) => reject({ filePath, error }));
  });
}


/**
 * Affiche la page entière.
 * @param {Map} data toutes les données.
 */
function displayAllStats(data) {
  // Display file details
  displayFileDetails(data);

  // Afficher la timeline avec les données récupérées
  displayTimeline(data);

  // Display & Debug Axel
  document.getElementById("ball_heatmap_buttons").innerHTML = "";
  displayNDebugAxel(data);

  // Affichage des statistiques gloables
  document.getElementById("playerStatsContent").innerHTML = "";
  document.getElementById("content").innerHTML = "";
  document.getElementById("barChart").innerHTML="";
  document.getElementById("barChartSelect").innerHTML="";
  displayPlayerStats(data);
}