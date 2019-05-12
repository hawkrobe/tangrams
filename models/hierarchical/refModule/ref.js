var _ = require('lodash');
var fs = require('fs');
var babyparse = require('babyparse');

var utterances = ['word1', 'word2']
var states = ['object1', 'object2']

var normalize = function(truth, sum) {
  return ad.scalar.sub(truth, ad.scalar.log(sum));
};

var getLexiconElement = function(lexicon, utt, target) {
  var utt_i = _.indexOf(utterances, utt);
  var target_i = _.indexOf(states, target);
  var lexiconElement = T.get(lexicon, utt_i * states.length + target_i);
  return lexiconElement;
};

// We directly implement RSA without webppl to avoid overhead
// P(t | utt) \propto L(t, utt)
// => log(p) = log ( L(t, utt)) - log(\sum_{i} L(t_i, utt))
var getL0score = function(target, utt, params) {
  var scores = [];
  var sum = 0;
  var truth = getLexiconElement(params.lexicon, utt, target);
  for(var i=0; i<params.context.length; i++){
    sum = ad.scalar.add(
      sum,
      ad.scalar.exp(getLexiconElement(params.lexicon, utt, params.context[i]))
    );
  }
  return normalize(truth, sum);
};

// return log P(u | o, c, l)
var getSpeakerScore = function(utt, targetObj, params) {
  var scores = [];
  var sum = 0;
  var truth = getL0score(targetObj, utt, params);
  for(var i=0; i< utterances.length; i++){
    var informativity = getL0score(targetObj, utterances[i], params);
    sum = ad.scalar.add(
      sum,
      ad.scalar.exp(informativity)
    );
  }
  return normalize(truth, sum);
};

// if P(o | u, c, l) = P(u | o, c, l) P(u | c, l) / sum_o P(u | o, c, l)
// then log(o | u, c, l) = log P(u | o, c, l) - log(sum_{o in context} P(u | o, c, l))
var getListenerScore = function(trueObj, utt, params) {
  var scores = [];
  var sum = 0;
  var truth = getSpeakerScore(utt, trueObj, params);
  for(var i=0; i< params.context.length; i++){
    var prob = getSpeakerScore(utt, params.context[i], params);
    sum = ad.scalar.add(
      sum,
      ad.scalar.exp(prob)
    );
  }
  return normalize(truth, sum);
};

var reformatData = function(rawData) {
  return _.map(rawData, function(row) {
    return _.omit(_.extend(row, {
      context: [row.object1name, row.object2name, row.object3name, row.object4name]
    }), 'object1name', 'object2name', 'object3name', 'object4name');
  });
}

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8'),
			 {header:true, skipEmptyLines:true}).data;
};

// Note this is highly specific to our particular situation
var bayesianErpWriter = function(erp, filePrefix) {
  var supp = erp.support();

  if(_.has(supp[0], 'predictive')) {
    var predictiveFile = fs.openSync(filePrefix + "Predictives.csv", 'a');
  }

  supp.forEach(function(s) {
    if(_.has(s, 'predictive'))
      supportWriter(s.predictive, predictiveFile);
  });

  if(_.has(supp[0], 'predictive')) {
    fs.closeSync(predictiveFile);
  }

  console.log('writing complete.');
};

var supportWriter = function(s, handle) {
  var sLst = _.toPairs(s);
  var l = sLst.length;

  for (var i = 0; i < l; i++) {
    fs.writeSync(handle, sLst[i].join(',') + '\n');
  }
};

module.exports = {
  getL0score, getSpeakerScore, getListenerScore, getLexiconElement, 
  reformatData, bayesianErpWriter, readCSV
};
