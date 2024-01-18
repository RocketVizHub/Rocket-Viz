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

      // Display & Debug axel
      document.getElementById("ball_heatmap_buttons").innerHTML = "";
      displayNDebugAxel(data);

      // sonia
      document.getElementById("playerStatsContent").innerHTML = "";
      document.getElementById("content").innerHTML = "";
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

function displayFileDetails(data) {
  console.log(Object.keys(data.properties));
  list_frame_demo = findFramesIndicesWithDemolishFx(data);
  console.log(getReservationAfterDestroy(data, list_frame_demo));
  console.log(getMaxFrames(data));
  console.log(getMaxTempsPartie(getMaxFrames(data), getFramerate(data)));
  console.log(getListeFramesHighlights(data));
  // console.log(getListFramesGoals(data));
  const fileDetailsElement = document.getElementById("fileDetails");
  fileDetailsElement.innerHTML = `
                <p><strong>header size:</strong> ${data.header_size}</p>
				<p><strong>Replay Name:</strong> ${data.properties.ReplayName}</p>
            `;
}

/** Partie Axel **/
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
    start_color: "#FC7C89",
    end_color: "#21A38B",
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

      if (playerTeam === "Blue") {
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
    .attr("fill", "blue");

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", height / 3 - 5)
    .attr("width", width)
    .attr("height", 18)
    .attr("fill", "orange");

  // Ajout du texte pour chaque équipe
  svg
    .append("text")
    .attr("x", -10)
    .attr("y", height / 4)
    .attr("text-anchor", "end")
    .text("Equipe Bleue")
    .attr("fill", "blue")
    .attr("font-size", "13px");

  svg
    .append("text")
    .attr("x", -10)
    .attr("y", height / 3)
    .attr("text-anchor", "end")
    .text("Equipe Orange")
    .attr("fill", "orange")
    .attr("font-size", "13px");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 - 10)
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
    .html(
      (d) =>
        `<img src="${d.icon}" alt="${d.description}" width="20" height="20"> ${d.description}`
    )
    .style("margin-right", "20px");
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

  const width = 350;
  const height = 350 * ratioXY;
  displayHeatmap(heatmap, {
    width: width,
    height: height,
    container: "#ball_heatmap",
    start_color: "#FC7C89",
    end_color: "#21A38B",
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
    start_color: "#FC7C89",
    end_color: "#21A38B",
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

  // Add a background to the SVG
  const background = svg
    .append("rect")
    .style("stroke", "black")
    .attr("width", width)
    .attr("height", height);

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
    .attr("width", x.rangeBand() + 0.4)
    .attr("height", y.rangeBand() + 0.4);
  // .attr("width", x.rangeBand()-0.3) if we want the borders

  row
    .selectAll(".cell")
    .data((d, i) => {
      return data[i];
    })
    .style("fill", colorMap);
}

/** Partie Nicolas  **/

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

  return `${dureeEnMinutes} minutes et ${dureeEnSecondesRestantes} secondes`;
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

/** Partie Sonia  **/

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
  let goals1 = 0,
    assists1 = 0,
    saves1 = 0,
    shots1 = 0,
    score1 = 0;

  team0.forEach((player) => {
    goals1 = goals1 + player.Goals;
    assists1 = assists1 + player.Assists;
    saves1 = saves1 + player.Saves;
    shots1 = shots1 + player.Shots;
    score1 = score1 + player.Score;
  });

  let goals = 0,
    assists = 0,
    saves = 0,
    shots = 0,
    score = 0;
  team1.forEach((player) => {
    goals = goals + player.Goals;
    assists = assists + player.Assists;
    saves = saves + player.Saves;
    shots = shots + player.Shots;
    score = score + player.Score;
  });

  const map = new Map();

  map.set("Score", { [team0[0].Team]: score1, [team1[1].Team]: score });
  map.set("Goals", { [team0[0].Team]: goals1, [team1[1].Team]: goals });
  map.set("Assists", { [team0[0].Team]: assists1, [team1[1].Team]: assists });
  map.set("Saves", { [team0[0].Team]: saves1, [team1[1].Team]: saves });
  map.set("Shots", { [team0[0].Team]: shots1, [team1[1].Team]: shots });

  console.log(map);

  return map;
}
/**
 * Récupère les statisques permettant de faire l'affichage de l'overview par équipe.
 * @param {*} data
 * @returns
 */
function getOverviewStats(data) {
  console.log("get", data);
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

  d3.selectAll("#content").append("h1").text("Statistiques par équipe");
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

  d3.selectAll("#content").append("h1").text("Pressure");
  d3.selectAll("#content")
    .append("p")
    .text("Pressure is a measure of how much time the ball spends on a side.");
  displayPressure(data_ball, sumXneg, sumXpos);
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
    .append("tr");

  rows2.append("td").text(function (d) {
    if (typeof d === "number" && Number.isInteger(d)) {
      d3.select(this)
        .classed("special-column", true)
        .attr("colspan", 6)
        .style("font-weight", "bold")
        .classed("text-light", true)
        .classed("team1", d === scoreTeam0)
        .classed("team2", d === scoreTeam1);
      return d;
    } else {
      return d.Name;
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
  var svg = d3
    .select("#content")
    .append("svg")
    .attr("width", 1000)
    .attr("height", 300);

  var width = 1000; // Ajout de la variable width pour référence

  // Rectangle pour les stats du joueur 1
  var rectanglesPlayer1 = svg
    .selectAll(".team1")
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
      .attr("x", parseFloat(d3.select(this).attr("x")) + rectWidth - 60)
      .attr("y", parseFloat(d3.select(this).attr("y")) + centrageVertical)
      .attr("class", "percentage-text");
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
      return d[1][1]; // Valeur de la team 1
    })
    .attr("y", function (d, i) {
      return i * 50 + centrageVertical; // Ajuster pour le centrage vertical
    })
    .attr("x", width - 30);
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
 * Calcule la pression (c'est-à-dire le temps que passe la balle dans chaque camp).
 * @param {Map} data_ball
 * @param {Integer} sumXneg
 * @param {Integer} sumXpos
 * @returns
 */
function displayPressure(data_ball, sumXneg, sumXpos) {
  getPieData = d3.pie().value(function (d) {
    console.log(d.value);
    return d.count;
  });
  var pieData = getPieData(data_ball);
  const width = 600;
  const height = 400;

  const svg = d3
    .select("#content")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // On utilise la fonction d3.arc qui va s'occuper de
  // déssiner les arcs de cercle pour nous
  const arcCreator = d3
    .arc()
    .innerRadius(0)
    .outerRadius(height / 2);

  // une échelle pour la couleur, comme vu plus haut
  // (en utilisant une palette de couleur catégorielle)
  const colors = d3
    .scaleOrdinal()
    .domain(data_ball.map((d) => d.team))
    .range(d3.schemePastel1);

  // un groupe pour centrer le camembert
  const pie = svg
    .append("g")
    .attr("transform", `translate(${height / 2}, ${height / 2})`);

  pie
    .selectAll("path")
    .data(pieData)
    .enter()
    .append("path") // Cette fois on utilise un chemin ('path') et non plus un 'rect' ou un 'circle'
    .attr("d", arcCreator) // La fonction responsable de dessiner le chemin pour les données actuelle
    .attr("fill", (d) => ({ Team1: "#307fe2", Team2: "#e87722" }[d.data.team]))

    .on("mouseover", (event, d) => {
      // On sélectionne le texte grace à sa classe
      // et on modifie la valeur d'opacité
      d3.select(`.text-${d.data.team}`).attr("opacity", 1);
    })
    .on("mouseout", (event, d) => {
      // On sélectionne le texte grace à sa classe
      // et on modifie la valeur d'opacité
      d3.select(`.text-${d.data.team}`).attr("opacity", 0);
    });

  // On ajoute un texte avec le nombre de team concerné pour chaque secteur
  // mais on définie l'opacité à 0
  // Cette opacité sera modifié (à 1) lors du survol sur le secteur correspondant
  pie
    .selectAll("text")
    .data(pieData)
    .enter()
    .append("text")
    // On met un nom de classe différent pour chaque texte,
    // pour permettre de sélectionner le bon texte
    // dans les gestionnaire d'événement mouseover / mouseout
    .attr("class", (d) => `text-${d.data.team}`)
    // .centroid permet de trouver le centre de la tranche
    .attr("transform", (d) => `translate(${arcCreator.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("opacity", 0)
    .text(function (d) {
      var percentage = (d.data.count / (sumXneg + sumXpos)) * 100;
      percentage = Math.round(percentage * 100) / 100;
      return percentage + "%";
    });

  // On va également créer une légende
  // Pour cela, on va lié un tableau contenant le nom des teams
  // avec des rectangles et des textes
  const legend = svg.append("g").attr("transform", `translate(${height - 10})`);

  const rectWidth = 20;

  // On va réutiliser l'échelle de couleurs, comme lors du dessin des secteurs
  legend
    .selectAll("rect")
    .data(pieData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * rectWidth)
    .attr("width", rectWidth)
    .attr("height", rectWidth)
    .attr("fill", (d) => ({ Team1: "#307fe2", Team2: "#e87722" }[d.data.team]));

  // les noms des teams
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

/***********************/

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);
