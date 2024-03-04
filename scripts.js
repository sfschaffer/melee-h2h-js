const token = "eff61c135e0546f45dbc554c02ee761d";
const url = "https://api.start.gg/gql/alpha";
import {ids} from "/ids.js";

const data = `query Sets ($playerId: ID!, $page: Int!, $perPage: Int!){
    player(id: $playerId) {
      sets(perPage: $perPage, page: $page) {
        nodes {
          id
          displayScore
          fullRoundText
          event{
            videogame{
              id
            }
            tournament{
                name
            }
          }
          }
        }
      }
    }`

document.querySelector("#submit").addEventListener("click", function(e){
    e.preventDefault();
    document.querySelector(".record").textContent = "Loading...";
    document.querySelector(".output").innerHTML = "";
    runH2H();
});

function getPlayerIds(){
    const firstTag = document.querySelector("#player1").value;
    const secondTag = document.querySelector("#player2").value;

    let firstID = null;
    let secondID = null;
    //need dropdown menu for this, the && firstId is a stopgap
    ids.forEach(element => {
        if(firstTag == element.tag && firstID == null){
            firstID = element.id;
        }
        else if(secondTag == element.tag && secondID == null){
            secondID = element.id;
        }
    });

    return [firstID, secondID];
}

async function sendRequest(playerID, pageNum){
    const response = await fetch(url, {
        method:`post`,
        body: JSON.stringify({
            query : data,
            variables:{
                playerId: playerID,
                page: pageNum,
                perPage: 100
            } 
        }),
        headers:{
            "Authorization" : `Bearer ${token}`
        }
    });

    return response.json();
}

function parseWinStr(winStr, player1, player2){
    if(!winStr || winStr == "DQ"){
        return null;
    }
    //filters out doubles sets
    let doublesFilter = new RegExp("(/ " + player1 + ")|(" + player1 + " /)");
    //filters out crew battles
    let crewFilter = new RegExp(".* (W|L) - .*(W|L)");

    if(winStr.match(doublesFilter)){
        return null;
    }

    else if(winStr.match(crewFilter)){
        return null;
    }

    else{
        let player1Exp = new RegExp("(\\| " + player1 + ")|(" + "^" + player1 + ")|( " + player1 + " [0-9])");
        let player2Exp = new RegExp("(\\| " + player2 + ")|(" + "^" + player2 + ")|( " + player2 + " [0-9])");
        let index = winStr.search(player1Exp) + player1.length;
        let score;
        console.log(winStr)
        do{
            index += 1;
            score = winStr[index];
            console.log(index, score);
        }
        while(!(score >= "0" && score <= "9"));

        let opIndex = winStr.search(player2Exp);
        if(opIndex == -1){
            return null;
        }
        
        index = opIndex + player2.length;
        let opScore;
        do{
            index += 1;
            opScore = winStr[index];
        }
        while(!(opScore >= "0" && opScore <= "9"));
        console.log(winStr);
        let winnerId;
        if(score > opScore || score == "W"){
            winnerId = {winner: 1, scoreLine: score + "-" + opScore};
        }
        else{
            winnerId = {winner: 2, scoreLine: score + "-" + opScore};
        }

        return winnerId;
    }
}

async function searchPlayerHistory(sets, checkedPlayerTag, oppTag, checkedPlayerID, oppID){
    let pageNum = 1;
    while(true){
        let page = await sendRequest(checkedPlayerID, pageNum)
        let nodes;
        if(page.errors){
            const err = document.createElement("div");
            err.textContent = "error with query";
            document.querySelector(".output").appendChild(err);
        }
        nodes = page.data.player.sets.nodes;
        console.log(pageNum, nodes.length);
        if(nodes.length < 1){
            return;
        }
        nodes.forEach(element=>{
            if(!sets.get(element.id) && element.event.videogame.id == 1){
                let winner = parseWinStr(element.displayScore, checkedPlayerTag, oppTag);
                if(winner){
                    sets.set(element.id, {
                        victor: winner.winner == 1 ? checkedPlayerTag : oppTag,
                        tournament: element.event.tournament.name,
                        round: element.fullRoundText,
                        score: winner.scoreLine
                    });
                }
            }
        });
        pageNum += 1;
    }
}

function createCard(info, player1, player2){
    const card = document.createElement("div");
    card.classList.add("card");

    const header = document.createElement("div");
    header.classList.add("header")
    header.textContent = `${info.tournament} - ${info.round}`;

    const body = document.createElement("div");
    body.classList.add("scoreline")

    const scoreline1 = document.createElement("div");
    scoreline1.classList.add("scoreline-entry")

    const scoreline2 = document.createElement("div");
    scoreline2.classList.add("scoreline-entry")

    const score1 = document.createElement("div");
    score1.classList.add("score");
    score1.textContent = `${info.score[0]}`;

    const score2 = document.createElement("div");
    score2.classList.add("score");
    score2.textContent = `${info.score[2]}`;

    const name1 = document.createElement("div");
    name1.classList.add("name");
    name1.textContent = `${player1}`

    const name2 = document.createElement("div");
    name2.classList.add("name");
    name2.textContent = `${player2}`

    scoreline1.appendChild(name1);
    scoreline1.appendChild(score1);

    scoreline2.appendChild(score2);
    scoreline2.appendChild(name2);

    body.appendChild(scoreline1);
    body.appendChild(scoreline2);

    card.appendChild(header);
    card.appendChild(body);

    if(info.victor == player1){
        card.classList.add("win");
    }
    else{
        card.classList.add("loss");
    }

    document.querySelector(".output").appendChild(card);
}
//////////////////////////////////////////////////////////////////

function filterEntries(data, searchText){
    let filtered = data.filter((x)=>x.tag.toLowerCase().includes(searchText.toLowerCase()));
    return filtered;
}
function createList(names, el, text){
    el.innerHTML = "";
    if(text == ""){
        return;
    }
    names.forEach((entry)=>{
        const listEntry = document.createElement("li");
        listEntry.classList.add("player-list-entry");
        listEntry.textContent = entry.tag;
        let playerLists = document.querySelectorAll(".player-list");
        listEntry.addEventListener("click", function(){
            if(el.classList.contains("first")){
                document.querySelector("#player1").value=listEntry.textContent;
                el.innerHTML="";
                return;
            }
            else{
                document.querySelector("#player2").value=listEntry.textContent;
                el.innerHTML="";
                return;
            }
        });
        el.appendChild(listEntry);
    })
}
const inputs = document.querySelectorAll(".player-input");

inputs[0].addEventListener("input", function(){
    let filteredList = filterEntries(ids, inputs[0].value);
    createList(filteredList, document.querySelector(".first"), inputs[0].value);
});

inputs[1].addEventListener("input", function(){
    let filteredList = filterEntries(ids, inputs[1].value);
    createList(filteredList, document.querySelector(".second"), inputs[1].value)
});

//////////////////////////////////////////////////////////////////
async function runH2H(){
    const player1 = document.querySelector("#player1").value;
    const player2 = document.querySelector("#player2").value;
    let players = getPlayerIds();
    const sets = new Map();
    
    //search records of both players, some sets appear on one record but not another
    await searchPlayerHistory(sets, player1, player2, players[0], players[1]);
    await searchPlayerHistory(sets, player2, player1, players[1], players[1]);

    let wins = 0;
    let losses = 0;
    sets.forEach((value, key)=>{
        createCard(value, player1, player2);
        if(value.victor == player1){
            wins += 1;
        }
        else{
            losses += 1;
        }
    });

    document.querySelector(".record").innerHTML = `${player1} - ${wins} ` + "&nbsp&nbsp&nbsp&nbsp&nbsp" + `${player2} - ${losses}`;

    console.log(`Wins ${wins} Losses ${losses}`);

    return;
}

