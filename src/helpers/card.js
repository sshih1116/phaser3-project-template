export default class Card {
  constructor(scene, cardData) {
    this.render = (x, y, cardData) => {
      let card = scene.add
        .image(x, y, "cards", cardData.frame)
        .setScale(1.5)
        .setOrigin(0.5, 0.5);
      return card;
    };
    this.customData = cardData;
  }
}
