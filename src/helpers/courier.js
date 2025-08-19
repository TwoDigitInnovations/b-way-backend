const courierGen = () => {
  let name = 'COURIER_';
  return name + Math.floor(Math.random() * 1000);
};

module.exports = courierGen;