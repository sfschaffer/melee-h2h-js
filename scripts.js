const token = "eff61c135e0546f45dbc554c02ee761d";
const url = "https://api.start.gg/gql/alpha";
import {ids} from "/ids.js";

const data = `query Sets ($playerId: ID!, $page: Int!, $perPage: Int!){
    player(id: $playerId) {
      sets(perPage: $perPage, page: $page) {
        nodes {
          id
          displayScore
          event{
            videogame{
              id
            }
          }
          }
        }
      }
    }`

console.log(ids[0]);

document.querySelector("#submit").addEventListener("click", function(e){
    e.preventDefault();
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

    console.log(firstID, secondID);

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

function parseWinStr(winStr){
    const player1 = document.querySelector("#player1").value;
    const player2 = document.querySelector("#player2").value;

    if(!winStr){
        return null;
    }
    //filters out doubles sets
    let doublesFilter = new RegExp("(/ " + player1 + ")|(" + player1 + " /)");
    //filters out crew battles
    let crewFilter = new RegExp("^Team");

    if(winStr.match(doublesFilter)){
        return null;
    }

    else if(winStr.match(crewFilter)){
        return null;
    }

    else{
        let player1Exp = new RegExp(player1 + " ");
        let player2Exp = new RegExp(player2 + " ");
        let score = winStr[winStr.search(player1Exp) + player1.length + 1];
        let opIndex = winStr.search(player2Exp);
        let opScore  = winStr[opIndex + player2.length + 1];

        if(opIndex == -1){
            return null;
        }

        let winnerId;
        if(score > opScore || score == "W"){
            winnerId = 1;
        }
        else{
            winnerId = 2;
        }

        return winnerId;
    }
}

async function runH2H(){
    let players = getPlayerIds();
    let pageNum = 1;
    const sets = new Map();
    let wins = 0;
    let losses = 0;
    while(true){
        let page = await sendRequest(players[0], pageNum)
        let nodes;
        if(page.errors){
            const err = document.createElement("div");
            err.textContent = "error with query";
            document.querySelector(".output").appendChild(err);
        }
        nodes = page.data.player.sets.nodes;
        console.log(nodes.length, pageNum);
        if(nodes.length < 1){
            console.log(`Wins ${wins} Losses ${losses}`);
            return;
        }
        nodes.forEach(element=>{
            if(!sets.get(element.id) && element.event.videogame.id == 1){
                let winner = parseWinStr(element.displayScore);
                if(winner){
                    console.log(winner, element.displayScore);
                    if(winner == 1){
                        wins += 1;
                    }
                    else{
                        losses += 1;
                    }
                }
            }
        });
        pageNum += 1;
    }

}

