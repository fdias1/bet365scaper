const puppeteer = require('puppeteer');
const iPhone = puppeteer.devices['iPhone 6'];

const main = async () => {
  try {
    const browser = await puppeteer.launch({headless:true});
    const page = await browser.newPage();
    await page.emulate(iPhone);
    await page.goto('https://www.bet365.com');
    
    //look for live soccer games
    await page.waitFor(2000)
    await page.click('[class="hm-MobileNavButtons_InPlay "]',{delay:863})
    await page.waitFor(2000)
    let recomendations = []
    console.log('lendo jogos e procurando cenários favoráveis...')
    setInterval(async () => {  
      const timers = await page.$$eval('[class="ipo-Fixture_GameInfo ipo-Fixture_Time "] > div', e => e.map((element,index) => {
        minutes = parseInt(element.innerHTML.substring(0,2)) 
        return minutes >= 25 && minutes <= 35 ? element.innerHTML: undefined
      }))
      await page.waitFor(1000)
      let gameStats = []
      const qtdJogosSelecionados = timers.filter(time => time != null).length

      if (qtdJogosSelecionados > 0) {
        console.log(new Date().toLocaleTimeString(),'Jogos acontecendo: ',timers.length,' | jogos selecionados: ',qtdJogosSelecionados)
      }

      for (let i=0; i < timers.length; i++) {
        if (timers[i] != null) {
          const gameList = await page.$$('[class="ipo-Fixture_GameDetail "]')
          await gameList[i].click({delay:500})
          await page.waitFor(2000)
          
          /*
          campo odds asiaticas
          class="ipe-Participant_OppName" campo com uma aposta especifica
          class="ipe-Participant_OppOdds " campo com as odds
          coluna com todas as odds de um time
          */
         
         
         
         const score = await page.$$eval('[class="ipe-EventViewTitleStandardScore_TeamScore ipe-EventViewTitleStandardScore_TeamScore-width1 "]',elements => elements.map(element => element.innerHTML))
         const home = await page.$$eval('[class="ipe-EventViewTitleStandardScore_TeamName ipe-EventViewTitleStandardScore_Team1Name "]',elements => elements.map(element => element.innerHTML))
         const away = await page.$$eval('[class="ipe-EventViewTitleStandardScore_TeamName ipe-EventViewTitleStandardScore_Team2Name "]',elements => elements.map(element => element.innerHTML))
         const statsHome = await page.$$eval('[class="ml1-StatsWheel_Team1Text "]',elements => elements.map(element => element.innerHTML))
         const statsAway = await page.$$eval('[class="ml1-StatsWheel_Team2Text "]',elements => elements.map(element => element.innerHTML))
         let statsTotal = []
         for (let i=0;i<statsHome.length;i++){
           statsTotal[i] = parseInt(statsHome[i]) + parseInt(statsAway[i])
          }
          const cards = await page.$$eval('[class="ml1-StatsColumn_MiniValue "]',elements => elements.map(element => element.innerHTML))
          const cardsHome = [cards[0],cards[1],cards[2]]
          const cardsAway = [cards[3],cards[4],cards[5]]
          const cardsTotal = [parseInt(cards[0])+parseInt(cards[3]),parseInt(cards[1])+parseInt(cards[4]),parseInt(cards[2])+parseInt(cards[5])]
          const odds = await page.$$eval('[class="ipe-MarketContainer ipe-MarketContainer_Market-1777 "] [class="ipe-Participant_OppOdds "]',elements => elements.map(element => element.innerHTML))
          const favourite = parseFloat(odds[0]) <= parseFloat(odds[2]) ? 'home':'away'
          const minibarHome = await page.$$eval('[class="ml1-StatsBar_MiniBarValue ml1-StatsBar_MiniBarValue-1 "]',elements => elements.map(element => element.innerHTML))
          const minibarAway = await page.$$eval('[class="ml1-StatsBar_MiniBarValue ml1-StatsBar_MiniBarValue-2 "]',elements => elements.map(element => element.innerHTML))
          const minibarTotal = [parseInt(minibarHome[0])+parseInt(minibarAway[0]),parseInt(minibarHome[1])+parseInt(minibarAway[1])]
          await page.waitFor(2000)
          
          gameStats.push({
            time:timers[i],
            favourite,
            home:{
              name: home[0],
              cards:cardsHome,
              miniBar:minibarHome,
              stats:statsHome,
              score:score[0]
            },
            away:
            {
              name: away[0],
              cards:cardsAway,
              miniBar:minibarAway,
              stats:statsAway,
              score:score[1]
            },
            stats:
            {
              cards:cardsTotal,
              miniBar:minibarTotal,
              stats:statsTotal,
            },
          })
          await page.goBack()
          await page.waitFor(2000)
          //console.log(new Date().toLocaleTimeString(),' - Lido jogo: ',home[0],' x ',away[0])
        }
      }
      gameStats.forEach(game => {
        const underDog = game.favourite == 'home' ? 'away':'home'
        const favourite = game.favourite

        //favorito pressionando para marcar um gol
        if(game[favourite].score <= game[underDog].score && game[favourite].stats[1] / game.stats.stats[1] > 0.5 && (game.stats.miniBar[0] == 0 || game[favourite].miniBar[0] / game.stats.miniBar[0] > 0.5)) {
          const title = game.home.name+game.away.name
          if (recomendations.filter( recomendation => recomendation == title).length == 0) {
            console.log('Time:',new Date().toLocaleTimeString(),`MATCH TIME: ${game.time} === GAME: ${game.home.name} x ${game.away.name} ===== BET: ${favourite} ====== REASON: FAVOURITE PUSHING`)
            recomendations.push(title)
          }
        }

        //Favorito na zona de conforto
        if(game[favourite].score > game[underDog].score && (game[favourite].stats[1] < game[underDog].stats[1] || (game[favourite].stats[2] < game[underDog].stats[2] || game[underDog].stats[2] == undefined))) {
          const title = game.home.name+game.away.name
          if (recomendations.filter( recomendation => recomendation == title).length == 0) {
            console.log('Time:',new Date().toLocaleTimeString(),`MATCH TIME: ${game.time} === GAME: ${game.home.name} x ${game.away.name} ===== BET: ${underDog} ====== REASON: FAVOURITE RELAXING`)
            recomendations.push(title)
          }
        }
        
        //underdog em desvantagem e revidando
        if(game[favourite].score >= game[underDog].score && game[underDog].stats[1] / game.stats.stats[1] > 0.5 && game[underDog].miniBar[0] / game.stats.miniBar[0] > 0.5) {
          const title = game.home.name+game.away.name
          if (recomendations.filter( recomendation => recomendation == title).length == 0) {
            console.log('Time:',new Date().toLocaleTimeString(),`MATCH TIME: ${game.time} === GAME: ${game.home.name} x ${game.away.name} ===== BET: ${underDog} ====== REASON: UNDERDOG REACTING`)
            recomendations.push(title)
          }
        }
        
        // time com jogadores a menos
        if(game[favourite].cards[1] > 0 || game[underDog].cards[1] > 0) {
          const title = game.home.name+game.away.name
          const recomendation = game[favourite].cards[1] < game[underDog].cards[1] ? favourite : underDog
          if (recomendations.filter( recomendation => recomendation == title).length == 0) {
            console.log('Time:',new Date().toLocaleTimeString(),`MATCH TIME: ${game.time} === GAME: ${game.home.name} x ${game.away.name} ===== BET: ${recomendation} ====== REASON: NUMERIC ADVANTAGE`)
            recomendations.push(title)
          }
        }
        
      })
      // other actions...
      //await browser.close();
    },
    30000)
    
  } catch {
    main()
  }
}
main()
