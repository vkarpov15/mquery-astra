const collections = require('astra-mongoose/dist/collections');

const astraUri = process.env.ASTRA_URI;

if (!astraUri) {
  throw new Error('No Astra URI!');
}

exports.getCollection = function(cb) {
  collections.MongoClient.connect(astraUri, (err, astraClient) => {
    if (err != null) {
      return cb(err);
    }

    astraClient.db().dropCollection('tests', function(err) {
      if (err != null && err.response?.status !== 404) {
        return cb(err);
      }
      astraClient.db().createCollection('tests', {}, function(err) {
        if (err != null) {
          return cb(err);
        }
        const collection = astraClient.db().collection('tests');
        return cb(null, collection);
      });
    });
  });
};

exports.dropCollection = function(cb) {
  cb(null);
};