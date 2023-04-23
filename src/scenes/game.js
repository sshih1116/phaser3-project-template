import io from "socket.io-client";
import Card from "../helpers/card";

export default class Game extends Phaser.Scene {
  constructor() {
    super({
      key: "Game",
    });
  }

  preload() {
    this.load.atlas(
      "cards",
      "src/assets/cardSpritesheet.png",
      "src/assets/cardSpritesheet.json"
    );
  }

  create() {
    let self = this;
    let cards = [];
    let startingBalance =
      localStorage.getItem("balance") >= 10
        ? localStorage.getItem("balance")
        : 10;

    this.player = {
      hand: [],
      totalCardValues: "",
      balance: startingBalance,
      bet: 0,
      chips: 0,
    };

    this.dealer = {
      hand: [],
      totalCardValues: "",
      finalDraw: false,
    };

    this.placeBet = () => {
      this.insufficientBalanceText.visible = false;
      let balanceDifference = self.player.balance - self.player.chips;
      if (balanceDifference >= 0) {
        self.player.bet += self.player.chips;
        self.player.balance -= self.player.chips;
      } else {
        this.insufficientBalanceText.visible = true;
      }
    };

    this.dealCards = () => {
      if (self.player.bet === 0) {
        this.resetText.visible = false;
        this.insufficientBalanceText.visible = true;
      } else {
        self.resetHands();

        this.placeBetText.visible = false;
        this.clearBetText.visible = false;
        this.playerCardValuesText.visible = true;
        this.dealerCardValuesText.visible = true;

        this.chipOne.visible = false;
        this.chipFive.visible = false;
        this.chipTwentyFive.visible = false;
        this.chipHundred.visible = false;
        this.chipFiveHundred.visible = false;
        this.chipThousand.visible = false;

        this.resetText.visible = false;
        this.insufficientBalanceText.visible = false;
        this.dealText.visible = false;
        this.hitText.visible = true;
        this.standText.visible = true;

        self.time.addEvent({
          delay: 500,
          callback: self.getPlayerCard,
          callbackScope: this,
        });
        self.time.addEvent({
          delay: 1000,
          callback: self.getDealerCard,
          callbackScope: this,
        });
        self.time.addEvent({
          delay: 1500,
          callback: self.getPlayerCard,
          callbackScope: this,
        });
        self.time.addEvent({
          delay: 2000,
          callback: self.getDealerCard,
          callbackScope: this,
        });
        self.time.addEvent({
          delay: 2250,
          callback: self.getPlayerCardValues,
          callbackScope: this,
        });
      }
    };

    this.resetHands = () => {
      this.player.hand = [];
      this.dealer.hand = [];
      this.dealer.finalDraw = false;
      self.setDeck();
    };

    this.setDeck = () => {
      self.deck = [];
      let suitSuffix = ["c", "d", "h", "s"];

      for (let i = 1; i < 14; i++) {
        suitSuffix.forEach(function (suit) {
          self.deck.push(i + suit);
        }, self);
      }
    };

    this.getPlayerCard = () => {
      if (
        self.winText._visible === true ||
        self.loseText._visible === true ||
        self.drawText._visible === true
      )
        return;

      let card = self.getRandomCard();
      card.x = 640 + 25 * self.player.hand.length;
      card.y = 500;
      self.player.hand.push(card);
      card.render(card.x, card.y, card.customData);

      if (self.player.hand.length > 2) {
        self.getPlayerCardValues();
      }
    };

    this.getDealerCard = () => {
      let card = self.getRandomCard();
      card.x = 640 + 25 * self.dealer.hand.length;
      card.y = 120;
      self.dealer.hand.push(card);
      if (self.dealer.hand.length === 2) {
        card.frame = "cardBack";
      }

      if (self.dealer.finalDraw) {
        self.checkCards();
      }
      card.render(card.x, card.y, card.customData);
      console.log(card);
    };

    this.checkCards = () => {
      if (self.resetText.visible === true) return;

      self.dealer.hand[1].frame = self.dealer.hand[1].customData.frame;

      self.getDealerCardValues();

      if (self.dealer.totalCardValues < 21 && !self.dealer.finalDraw) {
        self.dealer.finalDraw = true;
        self.time.addEvent({
          delay: 250,
          callback: self.getDealerCard,
          callbackScope: this,
        });
      } else {
        let reason;
        if (self.player.totalCardValues === self.dealer.totalCardValues) {
          self.handleDraw();
        } else if (
          self.player.totalCardValues >= self.dealer.totalCardValues ||
          self.dealer.totalCardValues > 21
        ) {
          reason =
            self.player.totalCardValues >= self.dealer.totalCardValues
              ? "BEAT DEALER"
              : "DEALER BUST";
          self.handlePlayerWin(reason);
        } else if (
          self.dealer.totalCardValues === 21 ||
          self.dealer.totalCardValues > self.player.totalCardValues
        ) {
          reason = "DEALER WIN";
          self.handlePlayerLoss(reason);
        }
      }
    };

    this.getRandomCard = () => {
      let randomIdx = Math.floor(Math.random() * (51 - 1)) + 0;
      let card = null;

      if (!self.deck[randomIdx]) {
        return self.getRandomCard();
      } else {
        let cardData = self.getCardData(randomIdx);

        let found = cards.filter(function (child) {
          return (
            child.customData.primaryValue === cardData.primaryValue &&
            child.customData.suit === cardData.suit &&
            child.customData.isRoyal === cardData.isRoyal
          );
        }, true);

        if (found.length > 0) {
          card = found[0];
        } else {
          card = new Card(self, cardData);
          cards.push(card);
        }
        return card;
      }
    };

    this.getCardData = (randomIdx) => {
      let card = self.deck[randomIdx];
      self.deck[randomIdx] = false;

      let cardData = {
        frame: card,
        suit: "",
        primaryValue: 0,
        secondaryValue: 0,
      };

      let suitSuffix = card.substr(-1);
      cardData.suit = self.getCardSuit(suitSuffix);

      let cardValue = parseInt(card.substring(0, card.length - 1));

      cardData.primaryValue = cardValue;
      cardData.isAce = false;
      cardData.isRoyal = false;

      if (cardValue === 1) {
        cardData.primaryValue = 1;
        cardData.secondaryValue = 11;
        cardData.isAce = true;
      } else if (cardValue >= 10) {
        cardData.primaryValue = 10;
        cardData.isRoyal = cardValue;
      }

      return cardData;
    };

    this.getCardSuit = (suitSuffix) => {
      switch (suitSuffix) {
        case "c":
          return "Clubs";
        case "d":
          return "Diamonds";
        case "h":
          return "Hearts";
        default:
          return "Spades";
      }
    };

    this.getPlayerCardValues = () => {
      self.player.totalCardValues = "";
      self.player.totalCardValues = self.getHandValue(self.player.hand);

      let reason;
      if (self.player.totalCardValues === 21) {
        reason = "21";
        self.handlePlayerWin(reason);
      } else if (self.player.totalCardValues > 21) {
        reason = "BUST";
        self.handlePlayerLoss(reason);
      }
    };

    this.getDealerCardValues = () => {
      self.dealer.totalCardValues = "";
      self.dealer.totalCardValues = self.getHandValue(self.dealer.hand);
    };

    this.getHandValue = (hand) => {
      let total = 0;
      let aces = 0;

      hand.forEach(function (card) {
        if (card.customData.isAce) {
          aces++;
        } else {
          total += card.customData.primaryValue;
        }
      }, self);

      if (aces > 0) {
        for (let i = 0; i < aces; i++) {
          let valueAce = total + 11;
          total += valueAce > 21 ? 1 : 11;
        }
      }
      return total;
    };

    this.handlePlayerWin = (reason) => {
      self.winText.text = "WIN: " + reason;
      self.winText.visible = true;
      self.player.balance += self.player.bet * 2;
      self.player.bet = 0;
      self.player.chips = 0;
      localStorage.setItem("balance", self.player.balance);
    };

    this.handlePlayerLoss = (reason) => {
      self.loseText.text = "LOSE: " + reason;
      self.loseText.visible = true;
      self.player.bet = 0;
      self.player.chips = 0;
      localStorage.setItem("balance", self.player.balance);
    };

    this.handleDraw = () => {
      self.drawText.text = "DRAW";
      self.drawText.visible = true;
      self.player.balance += self.player.bet;
      self.player.bet = 0;
      self.player.chips = 0;
      localStorage.setItem("balance", self.player.balance);
    };

    //Chips display
    this.chipOne = this.add
      .text(50, 675, ["1"])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive();

    this.chipFive = this.add
      .text(120, 675, ["5"])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive();

    this.chipTwentyFive = this.add
      .text(190, 675, ["25"])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive();

    this.chipHundred = this.add
      .text(75, 610, ["100"])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive();

    this.chipFiveHundred = this.add
      .text(150, 610, ["500"])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive();

    this.chipThousand = this.add
      .text(105, 550, ["1000"])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive();

    //Text display
    this.balanceText = this.add
      .text(1000, 550, ["BALANCE: " + self.player.balance])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(true);

    this.betText = this.add
      .text(1000, 500, ["BET: " + self.player.chips])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(true);

    this.clearBetText = this.add
      .text(1000, 450, ["CLEAR BET"])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(true)
      .setInteractive();

    this.hitText = this.add
      .text(540, 650, ["HIT"])
      .setFontSize(50)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive()
      .setVisible(false);

    this.standText = this.add
      .text(700, 650, ["STAND"])
      .setFontSize(50)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive()
      .setVisible(false);

    this.placeBetText = this.add
      .text(1000, 650, ["PLACE BET"])
      .setFontSize(50)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive()
      .setVisible(true);

    this.playerCardValuesText = this.add
      .text(600, 600, ["TOTAL: " + self.player.totalCardValues])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(false);

    this.dealerCardValuesText = this.add
      .text(600, 200, ["TOTAL: " + self.dealer.totalCardValues])
      .setFontSize(30)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(false);

    this.dealText = this.add
      .text(150, 390, ["DEAL"])
      .setFontSize(50)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setInteractive();

    this.winText = this.add
      .text(620, 370, [""])
      .setFontSize(40)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(false);

    this.loseText = this.add
      .text(620, 370, [""])
      .setFontSize(40)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(false);

    this.drawText = this.add
      .text(620, 370, [""])
      .setFontSize(40)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(false);

    this.resetText = this.add
      .text(150, 390, ["RESET"])
      .setFontSize(50)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(false)
      .setInteractive();

    this.insufficientBalanceText = this.add
      .text(500, 390, ["INSUFFICIENT BALANCE"])
      .setFontSize(40)
      .setFontFamily("Trebuchet MS")
      .setColor("#00FF41")
      .setVisible(false);

    this.dealText.on("pointerdown", function () {
      self.dealCards();
    });

    this.dealText.on("pointerover", function () {
      self.dealText.setColor("#ff69b4");
    });

    this.dealText.on("pointerout", function () {
      self.dealText.setColor("#00FF41");
    });

    this.hitText.on("pointerdown", function () {
      self.getPlayerCard();
    });

    this.hitText.on("pointerover", function () {
      self.hitText.setColor("#ff69b4");
    });

    this.hitText.on("pointerout", function () {
      self.hitText.setColor("#00FF41");
    });

    this.standText.on("pointerdown", function () {
      self.checkCards();
    });

    this.standText.on("pointerover", function () {
      self.standText.setColor("#ff69b4");
    });

    this.standText.on("pointerout", function () {
      self.standText.setColor("#00FF41");
    });

    this.placeBetText.on("pointerdown", function () {
      self.placeBet();
    });

    this.placeBetText.on("pointerover", function () {
      self.placeBetText.setColor("#ff69b4");
    });

    this.placeBetText.on("pointerout", function () {
      self.placeBetText.setColor("#00FF41");
    });

    this.clearBetText.on("pointerdown", function () {
      self.player.chips = 0;
    });

    this.clearBetText.on("pointerover", function () {
      self.clearBetText.setColor("#ff69b4");
    });

    this.clearBetText.on("pointerout", function () {
      self.clearBetText.setColor("#00FF41");
    });

    this.resetText.on("pointerdown", function () {
      self.scene.restart();
    });

    this.resetText.on("pointerover", function () {
      self.resetText.setColor("#ff69b4");
    });

    this.resetText.on("pointerout", function () {
      self.resetText.setColor("#00FF41");
    });

    //Chip functionality
    this.chipOne.on("pointerdown", function () {
      self.player.chips += 1;
    });

    this.chipOne.on("pointerover", function () {
      self.chipOne.setColor("#ff69b4");
    });

    this.chipOne.on("pointerout", function () {
      self.chipOne.setColor("#00FF41");
    });

    this.chipFive.on("pointerdown", function () {
      self.player.chips += 5;
    });

    this.chipFive.on("pointerover", function () {
      self.chipFive.setColor("#ff69b4");
    });

    this.chipFive.on("pointerout", function () {
      self.chipFive.setColor("#00FF41");
    });

    this.chipTwentyFive.on("pointerdown", function () {
      self.player.chips += 25;
    });

    this.chipTwentyFive.on("pointerover", function () {
      self.chipTwentyFive.setColor("#ff69b4");
    });

    this.chipTwentyFive.on("pointerout", function () {
      self.chipTwentyFive.setColor("#00FF41");
    });

    this.chipHundred.on("pointerdown", function () {
      self.player.chips += 100;
    });

    this.chipHundred.on("pointerover", function () {
      self.chipHundred.setColor("#ff69b4");
    });

    this.chipHundred.on("pointerout", function () {
      self.chipHundred.setColor("#00FF41");
    });

    this.chipFiveHundred.on("pointerdown", function () {
      self.player.chips += 500;
    });

    this.chipFiveHundred.on("pointerover", function () {
      self.chipFiveHundred.setColor("#ff69b4");
    });

    this.chipFiveHundred.on("pointerout", function () {
      self.chipFiveHundred.setColor("#00FF41");
    });

    this.chipThousand.on("pointerdown", function () {
      self.player.chips += 1000;
    });

    this.chipThousand.on("pointerover", function () {
      self.chipThousand.setColor("#ff69b4");
    });

    this.chipThousand.on("pointerout", function () {
      self.chipThousand.setColor("#00FF41");
    });
  }

  update() {
    this.playerCardValuesText.text = "TOTAL: " + this.player.totalCardValues;
    this.dealerCardValuesText.text = "TOTAL: " + this.dealer.totalCardValues;
    this.betText.text = "BET:  $" + this.player.chips;
    this.balanceText.text = "BALANCE:  $" + this.player.balance;

    if (
      this.winText.visible ||
      this.loseText.visible ||
      this.drawText.visible
    ) {
      this.hitText.visible = false;
      this.standText.visible = false;
      this.resetText.visible = true;

      this.resetHands();
    }
  }
}
