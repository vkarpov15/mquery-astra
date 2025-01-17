'use strict';

const mquery = require('../');
const assert = require('assert');

describe('mquery', function() {
  let col;
  this.timeout(5000);

  before(function(done) {
    this.timeout(20000);
    // get the env specific collection interface
    require('./env').getCollection(function(err, collection) {
      assert.ifError(err);
      col = collection;
      done();
    });
  });

  after(function(done) {
    require('./env').dropCollection(done);
  });

  describe('mquery', function() {
    it('is a function', function() {
      assert.equal('function', typeof mquery);
    });
    it('creates instances with the `new` keyword', function() {
      assert.ok(mquery() instanceof mquery);
    });
    describe('defaults', function() {
      it('are set', function() {
        const m = mquery();
        assert.strictEqual(undefined, m.op);
        assert.deepEqual({}, m.options);
      });
    });
    describe('criteria', function() {
      it('if collection-like is used as collection', function() {
        const m = mquery(col);
        assert.equal(col, m._collection.collection);
      });
      it('non-collection-like is used as criteria', function() {
        const m = mquery({ works: true });
        assert.ok(!m._collection);
        assert.deepEqual({ works: true }, m._conditions);
      });
    });
    describe('options', function() {
      it('are merged when passed', function() {
        let m;
        m = mquery(col, { w: 'majority' });
        assert.deepEqual({ w: 'majority' }, m.options);
        m = mquery({ name: 'mquery' }, { w: 'majority' });
        assert.deepEqual({ w: 'majority' }, m.options);
      });
    });
  });

  describe('toConstructor', function() {
    it('creates subclasses of mquery', function() {
      const opts = { safe: { w: 'majority' }, readPreference: 'p' };
      const match = { name: 'test', count: { $gt: 101 } };
      const select = { name: 1, count: 0 };
      const update = { $set: { x: true } };
      const path = 'street';

      const q = mquery().setOptions(opts);
      q.where(match);
      q.select(select);
      q.updateOne(update);
      q.where(path);
      q.find();

      const M = q.toConstructor();
      const m = M();

      assert.ok(m instanceof mquery);
      assert.deepEqual(opts, m.options);
      assert.deepEqual(match, m._conditions);
      assert.deepEqual(select, m._fields);
      assert.deepEqual(update, m._update);
      assert.equal(path, m._path);
      assert.equal('find', m.op);
    });
  });

  describe('setOptions', function() {
    it('calls associated methods', function() {
      const m = mquery();
      assert.equal(m._collection, null);
      m.setOptions({ collection: col });
      assert.equal(m._collection.collection, col);
    });
    it('directly sets option when no method exists', function() {
      const m = mquery();
      assert.equal(m.options.woot, null);
      m.setOptions({ woot: 'yay' });
      assert.equal(m.options.woot, 'yay');
    });
    it('is chainable', function() {
      const m = mquery();
      let n;

      n = m.setOptions();
      assert.equal(m, n);
      n = m.setOptions({ x: 1 });
      assert.equal(m, n);
    });
  });

  describe('collection', function() {
    it('sets the _collection', function() {
      const m = mquery();
      m.collection(col);
      assert.equal(m._collection.collection, col);
    });
    it('is chainable', function() {
      const m = mquery();
      const n = m.collection(col);
      assert.equal(m, n);
    });
  });

  describe('$where', function() {
    it('sets the $where condition', function() {
      const m = mquery();
      function go() {}
      m.$where(go);
      assert.ok(go === m._conditions.$where);
    });
    it('is chainable', function() {
      const m = mquery();
      const n = m.$where('x');
      assert.equal(m, n);
    });
  });

  describe('where', function() {
    it('without arguments', function() {
      const m = mquery();
      m.where();
      assert.deepEqual({}, m._conditions);
    });
    it('with non-string/object argument', function() {
      const m = mquery();

      assert.throws(function() {
        m.where([]);
      }, /path must be a string or object/);
    });
    describe('with one argument', function() {
      it('that is an object', function() {
        const m = mquery();
        m.where({ name: 'flawed' });
        assert.strictEqual(m._conditions.name, 'flawed');
      });
      it('that is a query', function() {
        const m = mquery({ name: 'first' });
        const n = mquery({ name: 'changed' });
        m.where(n);
        assert.strictEqual(m._conditions.name, 'changed');
      });
      it('that is a string', function() {
        const m = mquery();
        m.where('name');
        assert.equal('name', m._path);
        assert.strictEqual(m._conditions.name, undefined);
      });
    });
    it('with two arguments', function() {
      const m = mquery();
      m.where('name', 'The Great Pumpkin');
      assert.equal('name', m._path);
      assert.strictEqual(m._conditions.name, 'The Great Pumpkin');
    });
    it('is chainable', function() {
      const m = mquery();

      let n = m.where('x', 'y');
      assert.equal(m, n);
      n = m.where();
      assert.equal(m, n);
    });
  });
  describe('equals', function() {
    it('must be called after where()', function() {
      const m = mquery();
      assert.throws(function() {
        m.equals();
      }, /must be used after where/);
    });
    it('sets value of path set with where()', function() {
      const m = mquery();
      m.where('age').equals(1000);
      assert.deepEqual({ age: 1000 }, m._conditions);
    });
    it('is chainable', function() {
      const m = mquery();
      const n = m.where('x').equals(3);
      assert.equal(m, n);
    });
  });
  describe('eq', function() {
    it('is alias of equals', function() {
      const m = mquery();
      m.where('age').eq(1000);
      assert.deepEqual({ age: 1000 }, m._conditions);
    });
  });
  describe('or', function() {
    it('pushes onto the internal $or condition', function() {
      const m = mquery();
      m.or({ 'Nightmare Before Christmas': true });
      assert.deepEqual([{ 'Nightmare Before Christmas': true }], m._conditions.$or);
    });
    it('allows passing arrays', function() {
      const m = mquery();
      const arg = [{ 'Nightmare Before Christmas': true }, { x: 1 }];
      m.or(arg);
      assert.deepEqual(arg, m._conditions.$or);
    });
    it('allows calling multiple times', function() {
      const m = mquery();
      const arg = [{ looper: true }, { x: 1 }];
      m.or(arg);
      m.or({ y: 1 });
      m.or([{ w: 'oo' }, { z: 'oo' }]);
      assert.deepEqual([{ looper: true }, { x: 1 }, { y: 1 }, { w: 'oo' }, { z: 'oo' }], m._conditions.$or);
    });
    it('is chainable', function() {
      const m = mquery();
      m.or({ o: 'k' }).where('name', 'table');
      assert.deepEqual({ name: 'table', $or: [{ o: 'k' }] }, m._conditions);
    });
  });

  describe('nor', function() {
    it('pushes onto the internal $nor condition', function() {
      const m = mquery();
      m.nor({ 'Nightmare Before Christmas': true });
      assert.deepEqual([{ 'Nightmare Before Christmas': true }], m._conditions.$nor);
    });
    it('allows passing arrays', function() {
      const m = mquery();
      const arg = [{ 'Nightmare Before Christmas': true }, { x: 1 }];
      m.nor(arg);
      assert.deepEqual(arg, m._conditions.$nor);
    });
    it('allows calling multiple times', function() {
      const m = mquery();
      const arg = [{ looper: true }, { x: 1 }];
      m.nor(arg);
      m.nor({ y: 1 });
      m.nor([{ w: 'oo' }, { z: 'oo' }]);
      assert.deepEqual([{ looper: true }, { x: 1 }, { y: 1 }, { w: 'oo' }, { z: 'oo' }], m._conditions.$nor);
    });
    it('is chainable', function() {
      const m = mquery();
      m.nor({ o: 'k' }).where('name', 'table');
      assert.deepEqual({ name: 'table', $nor: [{ o: 'k' }] }, m._conditions);
    });
  });

  describe('and', function() {
    it('pushes onto the internal $and condition', function() {
      const m = mquery();
      m.and({ 'Nightmare Before Christmas': true });
      assert.deepEqual([{ 'Nightmare Before Christmas': true }], m._conditions.$and);
    });
    it('allows passing arrays', function() {
      const m = mquery();
      const arg = [{ 'Nightmare Before Christmas': true }, { x: 1 }];
      m.and(arg);
      assert.deepEqual(arg, m._conditions.$and);
    });
    it('allows calling multiple times', function() {
      const m = mquery();
      const arg = [{ looper: true }, { x: 1 }];
      m.and(arg);
      m.and({ y: 1 });
      m.and([{ w: 'oo' }, { z: 'oo' }]);
      assert.deepEqual([{ looper: true }, { x: 1 }, { y: 1 }, { w: 'oo' }, { z: 'oo' }], m._conditions.$and);
    });
    it('is chainable', function() {
      const m = mquery();
      m.and({ o: 'k' }).where('name', 'table');
      assert.deepEqual({ name: 'table', $and: [{ o: 'k' }] }, m._conditions);
    });
  });

  function generalCondition(type) {
    return function() {
      it('accepts 2 args', function() {
        const m = mquery()[type]('count', 3);
        const check = {};
        check['$' + type] = 3;
        assert.deepEqual(m._conditions.count, check);
      });
      it('uses previously set `where` path if 1 arg passed', function() {
        const m = mquery().where('count')[type](3);
        const check = {};
        check['$' + type] = 3;
        assert.deepEqual(m._conditions.count, check);
      });
      it('throws if 1 arg was passed but no previous `where` was used', function() {
        assert.throws(function() {
          mquery()[type](3);
        }, /must be used after where/);
      });
      it('is chainable', function() {
        const m = mquery().where('count')[type](3).where('x', 8);
        const check = { x: 8, count: {} };
        check.count['$' + type] = 3;
        assert.deepEqual(m._conditions, check);
      });
      it('overwrites previous value', function() {
        const m = mquery().where('count')[type](3)[type](8);
        const check = {};
        check['$' + type] = 8;
        assert.deepEqual(m._conditions.count, check);
      });

      // ASTRA: test which query operators are supported
      it('executes', async function() {
        const m = mquery(col).find()[type]('count', 3);
        await m;
      });
    };
  }

  'gt gte lt lte ne in nin regex size maxDistance minDistance'.split(' ').forEach(function(type) {
    describe(type, generalCondition(type));
  });

  describe('mod', function() {
    describe('with 1 argument', function() {
      it('requires a previous where()', function() {
        assert.throws(function() {
          mquery().mod([30, 10]);
        }, /must be used after where/);
      });
      it('works', function() {
        const m = mquery().where('madmen').mod([10, 20]);
        assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
      });
    });

    describe('with 2 arguments and second is non-Array', function() {
      it('requires a previous where()', function() {
        assert.throws(function() {
          mquery().mod('x', 10);
        }, /must be used after where/);
      });
      it('works', function() {
        const m = mquery().where('madmen').mod(10, 20);
        assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
      });
    });

    it('with 2 arguments and second is an array', function() {
      const m = mquery().mod('madmen', [10, 20]);
      assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
    });

    it('with 3 arguments', function() {
      const m = mquery().mod('madmen', 10, 20);
      assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
    });

    it('is chainable', function() {
      const m = mquery().mod('madmen', 10, 20).where('x', 8);
      const check = { madmen: { $mod: [10, 20] }, x: 8 };
      assert.deepEqual(m._conditions, check);
    });
  });

  describe('exists', function() {
    it('with 0 args', function() {
      it('throws if not used after where()', function() {
        assert.throws(function() {
          mquery().exists();
        }, /must be used after where/);
      });
      it('works', function() {
        const m = mquery().where('name').exists();
        const check = { name: { $exists: true } };
        assert.deepEqual(m._conditions, check);
      });
    });

    describe('with 1 arg', function() {
      describe('that is boolean', function() {
        it('throws if not used after where()', function() {
          assert.throws(function() {
            mquery().exists();
          }, /must be used after where/);
        });
        it('works', function() {
          const m = mquery().exists('name', false);
          const check = { name: { $exists: false } };
          assert.deepEqual(m._conditions, check);
        });
      });
      describe('that is not boolean', function() {
        it('sets the value to `true`', function() {
          const m = mquery().where('name').exists('yummy');
          const check = { yummy: { $exists: true } };
          assert.deepEqual(m._conditions, check);
        });
      });
    });

    describe('with 2 args', function() {
      it('works', function() {
        const m = mquery().exists('yummy', false);
        const check = { yummy: { $exists: false } };
        assert.deepEqual(m._conditions, check);
      });
    });

    it('is chainable', function() {
      const m = mquery().where('name').exists().find({ x: 1 });
      const check = { name: { $exists: true }, x: 1 };
      assert.deepEqual(m._conditions, check);
    });
  });

  describe('elemMatch', function() {
    describe('with null/undefined first argument', function() {
      assert.throws(function() {
        mquery().elemMatch();
      }, /Invalid argument/);
      assert.throws(function() {
        mquery().elemMatch(null);
      }, /Invalid argument/);
      assert.doesNotThrow(function() {
        mquery().elemMatch('', {});
      });
    });

    describe('with 1 argument', function() {
      it('throws if not a function or object', function() {
        assert.throws(function() {
          mquery().elemMatch([]);
        }, /Invalid argument/);
      });

      describe('that is an object', function() {
        it('throws if no previous `where` was used', function() {
          assert.throws(function() {
            mquery().elemMatch({});
          }, /must be used after where/);
        });
        it('works', function() {
          const m = mquery().where('comment').elemMatch({ author: 'joe', votes: { $gte: 3 } });
          assert.deepEqual({ comment: { $elemMatch: { author: 'joe', votes: { $gte: 3 } } } }, m._conditions);
        });
      });
      describe('that is a function', function() {
        it('throws if no previous `where` was used', function() {
          assert.throws(function() {
            mquery().elemMatch(function() {});
          }, /must be used after where/);
        });
        it('works', function() {
          const m = mquery().where('comment').elemMatch(function(query) {
            query.where({ author: 'joe', votes: { $gte: 3 } });
          });
          assert.deepEqual({ comment: { $elemMatch: { author: 'joe', votes: { $gte: 3 } } } }, m._conditions);
        });
      });
    });

    describe('with 2 arguments', function() {
      describe('and the 2nd is an object', function() {
        it('works', function() {
          const m = mquery().elemMatch('comment', { author: 'joe', votes: { $gte: 3 } });
          assert.deepEqual({ comment: { $elemMatch: { author: 'joe', votes: { $gte: 3 } } } }, m._conditions);
        });
      });
      describe('and the 2nd is a function', function() {
        it('works', function() {
          const m = mquery().elemMatch('comment', function(query) {
            query.where({ author: 'joe', votes: { $gte: 3 } });
          });
          assert.deepEqual({ comment: { $elemMatch: { author: 'joe', votes: { $gte: 3 } } } }, m._conditions);
        });
      });
      it('and the 2nd is not a function or object', function() {
        assert.throws(function() {
          mquery().elemMatch('comment', []);
        }, /Invalid argument/);
      });
    });
  });

  describe('within', function() {
    it('is chainable', function() {
      const m = mquery();
      assert.equal(m.where('a').within(), m);
    });
    describe('when called with arguments', function() {
      it('must follow where()', function() {
        assert.throws(function() {
          mquery().within([]);
        }, /must be used after where/);
      });

      describe('of length 1', function() {
        it('throws if not a recognized shape', function() {
          assert.throws(function() {
            mquery().where('loc').within({});
          }, /Invalid argument/);
          assert.throws(function() {
            mquery().where('loc').within(null);
          }, /Invalid argument/);
        });
        it('delegates to circle when center exists', function() {
          const m = mquery().where('loc').within({ center: [10, 10], radius: 3 });
          assert.deepEqual({ $geoWithin: { $center: [[10, 10], 3] } }, m._conditions.loc);
        });
        it('delegates to box when exists', function() {
          const m = mquery().where('loc').within({ box: [[10, 10], [11, 14]] });
          assert.deepEqual({ $geoWithin: { $box: [[10, 10], [11, 14]] } }, m._conditions.loc);
        });
        it('delegates to polygon when exists', function() {
          const m = mquery().where('loc').within({ polygon: [[10, 10], [11, 14], [10, 9]] });
          assert.deepEqual({ $geoWithin: { $polygon: [[10, 10], [11, 14], [10, 9]] } }, m._conditions.loc);
        });
        it('delegates to geometry when exists', function() {
          const m = mquery().where('loc').within({ type: 'Polygon', coordinates: [[10, 10], [11, 14], [10, 9]] });
          assert.deepEqual({ $geoWithin: { $geometry: { type: 'Polygon', coordinates: [[10, 10], [11, 14], [10, 9]] } } }, m._conditions.loc);
        });
      });

      describe('of length 2', function() {
        it('delegates to box()', function() {
          const m = mquery().where('loc').within([1, 2], [2, 5]);
          assert.deepEqual(m._conditions.loc, { $geoWithin: { $box: [[1, 2], [2, 5]] } });
        });
      });

      describe('of length > 2', function() {
        it('delegates to polygon()', function() {
          const m = mquery().where('loc').within([1, 2], [2, 5], [2, 4], [1, 3]);
          assert.deepEqual(m._conditions.loc, { $geoWithin: { $polygon: [[1, 2], [2, 5], [2, 4], [1, 3]] } });
        });
      });
    });
  });

  describe('geoWithin', function() {
    before(function() {
      mquery.use$geoWithin = false;
    });
    after(function() {
      mquery.use$geoWithin = true;
    });
    describe('when called with arguments', function() {
      describe('of length 1', function() {
        it('delegates to circle when center exists', function() {
          const m = mquery().where('loc').within({ center: [10, 10], radius: 3 });
          assert.deepEqual({ $within: { $center: [[10, 10], 3] } }, m._conditions.loc);
        });
        it('delegates to box when exists', function() {
          const m = mquery().where('loc').within({ box: [[10, 10], [11, 14]] });
          assert.deepEqual({ $within: { $box: [[10, 10], [11, 14]] } }, m._conditions.loc);
        });
        it('delegates to polygon when exists', function() {
          const m = mquery().where('loc').within({ polygon: [[10, 10], [11, 14], [10, 9]] });
          assert.deepEqual({ $within: { $polygon: [[10, 10], [11, 14], [10, 9]] } }, m._conditions.loc);
        });
        it('delegates to geometry when exists', function() {
          const m = mquery().where('loc').within({ type: 'Polygon', coordinates: [[10, 10], [11, 14], [10, 9]] });
          assert.deepEqual({ $within: { $geometry: { type: 'Polygon', coordinates: [[10, 10], [11, 14], [10, 9]] } } }, m._conditions.loc);
        });
      });

      describe('of length 2', function() {
        it('delegates to box()', function() {
          const m = mquery().where('loc').within([1, 2], [2, 5]);
          assert.deepEqual(m._conditions.loc, { $within: { $box: [[1, 2], [2, 5]] } });
        });
      });

      describe('of length > 2', function() {
        it('delegates to polygon()', function() {
          const m = mquery().where('loc').within([1, 2], [2, 5], [2, 4], [1, 3]);
          assert.deepEqual(m._conditions.loc, { $within: { $polygon: [[1, 2], [2, 5], [2, 4], [1, 3]] } });
        });
      });
    });
  });

  describe('box', function() {
    describe('with 1 argument', function() {
      it('throws', function() {
        assert.throws(function() {
          mquery().box('sometihng');
        }, /Invalid argument/);
      });
    });
    describe('with > 3 arguments', function() {
      it('throws', function() {
        assert.throws(function() {
          mquery().box(1, 2, 3, 4);
        }, /Invalid argument/);
      });
    });

    describe('with 2 arguments', function() {
      it('throws if not used after where()', function() {
        assert.throws(function() {
          mquery().box([], []);
        }, /must be used after where/);
      });
      it('works', function() {
        const m = mquery().where('loc').box([1, 2], [3, 4]);
        assert.deepEqual(m._conditions.loc, { $geoWithin: { $box: [[1, 2], [3, 4]] } });
      });
    });

    describe('with 3 arguments', function() {
      it('works', function() {
        const m = mquery().box('loc', [1, 2], [3, 4]);
        assert.deepEqual(m._conditions.loc, { $geoWithin: { $box: [[1, 2], [3, 4]] } });
      });
    });
  });

  describe('polygon', function() {
    describe('when first argument is not a string', function() {
      it('throws if not used after where()', function() {
        assert.throws(function() {
          mquery().polygon({});
        }, /must be used after where/);

        assert.doesNotThrow(function() {
          mquery().where('loc').polygon([1, 2], [2, 3], [3, 6]);
        });
      });

      it('assigns arguments to within polygon condition', function() {
        const m = mquery().where('loc').polygon([1, 2], [2, 3], [3, 6]);
        assert.deepEqual(m._conditions, { loc: { $geoWithin: { $polygon: [[1, 2], [2, 3], [3, 6]] } } });
      });
    });

    describe('when first arg is a string', function() {
      it('assigns remaining arguments to within polygon condition', function() {
        const m = mquery().polygon('loc', [1, 2], [2, 3], [3, 6]);
        assert.deepEqual(m._conditions, { loc: { $geoWithin: { $polygon: [[1, 2], [2, 3], [3, 6]] } } });
      });
    });
  });

  describe('circle', function() {
    describe('with one arg', function() {
      it('must follow where()', function() {
        assert.throws(function() {
          mquery().circle('x');
        }, /must be used after where/);
        assert.doesNotThrow(function() {
          mquery().where('loc').circle({ center: [0, 0], radius: 3 });
        });
      });
      it('works', function() {
        const m = mquery().where('loc').circle({ center: [0, 0], radius: 3 });
        assert.deepEqual(m._conditions, { loc: { $geoWithin: { $center: [[0, 0], 3] } } });
      });
    });
    describe('with 3 args', function() {
      it('throws', function() {
        assert.throws(function() {
          mquery().where('loc').circle(1, 2, 3);
        }, /Invalid argument/);
      });
    });
    describe('requires radius and center', function() {
      assert.throws(function() {
        mquery().circle('loc', { center: 1 });
      }, /center and radius are required/);
      assert.throws(function() {
        mquery().circle('loc', { radius: 1 });
      }, /center and radius are required/);
      assert.doesNotThrow(function() {
        mquery().circle('loc', { center: [1, 2], radius: 1 });
      });
    });
  });

  describe('geometry', function() {
    // within + intersects
    const point = { type: 'Point', coordinates: [[0, 0], [1, 1]] };

    it('must be called after within or intersects', function(done) {
      assert.throws(function() {
        mquery().where('a').geometry(point);
      }, /must come after/);

      assert.doesNotThrow(function() {
        mquery().where('a').within().geometry(point);
      });

      assert.doesNotThrow(function() {
        mquery().where('a').intersects().geometry(point);
      });

      done();
    });

    // ASTRA: geoIntersects test
    it('exec', async function() {
      await mquery(col).where('a').intersects().geometry(point);
    });

    describe('when called with one argument', function() {
      describe('after within()', function() {
        it('and arg quacks like geoJSON', function(done) {
          const m = mquery().where('a').within().geometry(point);
          assert.deepEqual({ a: { $geoWithin: { $geometry: point } } }, m._conditions);
          done();
        });
      });

      describe('after intersects()', function() {
        it('and arg quacks like geoJSON', function(done) {
          const m = mquery().where('a').intersects().geometry(point);
          assert.deepEqual({ a: { $geoIntersects: { $geometry: point } } }, m._conditions);
          done();
        });
      });

      it('and arg does not quack like geoJSON', function(done) {
        assert.throws(function() {
          mquery().where('b').within().geometry({ type: 1, coordinates: 2 });
        }, /Invalid argument/);
        done();
      });
    });

    describe('when called with zero arguments', function() {
      it('throws', function(done) {
        assert.throws(function() {
          mquery().where('a').within().geometry();
        }, /Invalid argument/);

        done();
      });
    });

    describe('when called with more than one arguments', function() {
      it('throws', function(done) {
        assert.throws(function() {
          mquery().where('a').within().geometry({ type: 'a', coordinates: [] }, 2);
        }, /Invalid argument/);
        done();
      });
    });
  });

  describe('intersects', function() {
    it('must be used after where()', function(done) {
      const m = mquery();
      assert.throws(function() {
        m.intersects();
      }, /must be used after where/);
      done();
    });

    it('sets geo comparison to "$intersects"', function(done) {
      const n = mquery().where('a').intersects();
      assert.equal('$geoIntersects', n._geoComparison);
      done();
    });

    it('is chainable', function() {
      const m = mquery();
      assert.equal(m.where('a').intersects(), m);
    });

    it('calls geometry if argument quacks like geojson', function(done) {
      const m = mquery();
      const o = { type: 'LineString', coordinates: [[0, 1], [3, 40]] };
      let ran = false;

      m.geometry = function(arg) {
        ran = true;
        assert.deepEqual(o, arg);
      };

      m.where('a').intersects(o);
      assert.ok(ran);

      done();
    });

    it('throws if argument is not geometry-like', function(done) {
      const m = mquery().where('a');

      assert.throws(function() {
        m.intersects(null);
      }, /Invalid argument/);

      assert.throws(function() {
        m.intersects(undefined);
      }, /Invalid argument/);

      assert.throws(function() {
        m.intersects(false);
      }, /Invalid argument/);

      assert.throws(function() {
        m.intersects({});
      }, /Invalid argument/);

      assert.throws(function() {
        m.intersects([]);
      }, /Invalid argument/);

      assert.throws(function() {
        m.intersects(function() {});
      }, /Invalid argument/);

      assert.throws(function() {
        m.intersects(NaN);
      }, /Invalid argument/);

      done();
    });
  });

  describe('near', function() {
    // near nearSphere
    describe('with 0 args', function() {
      it('is compatible with geometry()', function(done) {
        const q = mquery().where('x').near().geometry({ type: 'Point', coordinates: [180, 11] });
        assert.deepEqual({ $near: { $geometry: { type: 'Point', coordinates: [180, 11] } } }, q._conditions.x);
        done();
      });
    });

    describe('with 1 arg', function() {
      it('throws if not used after where()', function() {
        assert.throws(function() {
          mquery().near(1);
        }, /must be used after where/);
      });
      it('does not throw if used after where()', function() {
        assert.doesNotThrow(function() {
          mquery().where('loc').near({ center: [1, 1] });
        });
      });
    });
    describe('with > 2 args', function() {
      it('throws', function() {
        assert.throws(function() {
          mquery().near(1, 2, 3);
        }, /Invalid argument/);
      });
    });

    it('creates $geometry args for GeoJSON', function() {
      const m = mquery().where('loc').near({ center: { type: 'Point', coordinates: [10, 10] } });
      assert.deepEqual({ $near: { $geometry: { type: 'Point', coordinates: [10, 10] } } }, m._conditions.loc);
    });

    it('expects `center`', function() {
      assert.throws(function() {
        mquery().near('loc', { maxDistance: 3 });
      }, /center is required/);
      assert.doesNotThrow(function() {
        mquery().near('loc', { center: [3, 4] });
      });
    });

    it('accepts spherical conditions', function() {
      const m = mquery().where('loc').near({ center: [1, 2], spherical: true });
      assert.deepEqual(m._conditions, { loc: { $nearSphere: [1, 2] } });
    });

    it('is non-spherical by default', function() {
      const m = mquery().where('loc').near({ center: [1, 2] });
      assert.deepEqual(m._conditions, { loc: { $near: [1, 2] } });
    });

    it('supports maxDistance', function() {
      const m = mquery().where('loc').near({ center: [1, 2], maxDistance: 4 });
      assert.deepEqual(m._conditions, { loc: { $near: [1, 2], $maxDistance: 4 } });
    });

    it('supports minDistance', function() {
      const m = mquery().where('loc').near({ center: [1, 2], minDistance: 4 });
      assert.deepEqual(m._conditions, { loc: { $near: [1, 2], $minDistance: 4 } });
    });

    it('is chainable', function() {
      const m = mquery().where('loc').near({ center: [1, 2], maxDistance: 4 }).find({ x: 1 });
      assert.deepEqual(m._conditions, { loc: { $near: [1, 2], $maxDistance: 4 }, x: 1 });
    });

    describe('supports passing GeoJSON, gh-13', function() {
      it('with center', function() {
        const m = mquery().where('loc').near({
          center: { type: 'Point', coordinates: [1, 1] },
          maxDistance: 2
        });

        const expect = {
          loc: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [1, 1]
              },
              $maxDistance: 2
            }
          }
        };

        assert.deepEqual(m._conditions, expect);
      });
    });
  });

  // fields

  describe('select', function() {
    describe('with 0 args', function() {
      it('is chainable', function() {
        const m = mquery();
        assert.equal(m, m.select());
      });
    });

    it('accepts an object', function() {
      const o = { x: 1, y: 1 };
      const m = mquery().select(o);
      assert.deepEqual(m._fields, o);
    });

    it('accepts a string', function() {
      const o = 'x -y';
      const m = mquery().select(o);
      assert.deepEqual(m._fields, { x: 1, y: 0 });
    });

    it('does accept an array', function() {
      const o = ['x', '-y'];
      const m = mquery().select(o);
      assert.deepEqual(m._fields, { x: 1, y: 0 });
    });

    it('merges previous arguments', function() {
      const o = { x: 1, y: 0, a: 1 };
      const m = mquery().select(o);
      m.select('z -u w').select({ x: 0 });
      assert.deepEqual(m._fields, {
        x: 0,
        y: 0,
        z: 1,
        u: 0,
        w: 1,
        a: 1
      });
    });

    it('rejects non-string, object, arrays', function() {
      assert.throws(function() {
        mquery().select(function() {});
      }, /Invalid select\(\) argument/);
    });

    it('accepts arguments objects', function() {
      const m = mquery();
      function t() {
        m.select(arguments);
        assert.deepEqual(m._fields, { x: 1, y: 0 });
      }
      t('x', '-y');
    });

    noDistinct('select');
  });

  describe('selected', function() {
    it('returns true when fields have been selected', function(done) {
      let m;

      m = mquery().select({ name: 1 });
      assert.ok(m.selected());

      m = mquery().select('name');
      assert.ok(m.selected());

      done();
    });

    it('returns false when no fields have been selected', function(done) {
      const m = mquery();
      assert.strictEqual(false, m.selected());
      done();
    });
  });

  describe('selectedInclusively', function() {
    describe('returns false', function() {
      it('when no fields have been selected', function(done) {
        assert.strictEqual(false, mquery().selectedInclusively());
        assert.equal(false, mquery().select({}).selectedInclusively());
        done();
      });
      it('when any fields have been excluded', function(done) {
        assert.strictEqual(false, mquery().select('-name').selectedInclusively());
        assert.strictEqual(false, mquery().select({ name: 0 }).selectedInclusively());
        assert.strictEqual(false, mquery().select('name bio -_id').selectedInclusively());
        assert.strictEqual(false, mquery().select({ name: 1, _id: 0 }).selectedInclusively());
        done();
      });
      it('when using $meta', function(done) {
        assert.strictEqual(false, mquery().select({ name: { $meta: 'textScore' } }).selectedInclusively());
        done();
      });
    });

    describe('returns true', function() {
      it('when fields have been included', function(done) {
        assert.equal(true, mquery().select('name').selectedInclusively());
        assert.equal(true, mquery().select({ name: 1 }).selectedInclusively());
        done();
      });
    });
  });

  describe('selectedExclusively', function() {
    describe('returns false', function() {
      it('when no fields have been selected', function(done) {
        assert.equal(false, mquery().selectedExclusively());
        assert.equal(false, mquery().select({}).selectedExclusively());
        done();
      });
      it('when fields have only been included', function(done) {
        assert.equal(false, mquery().select('name').selectedExclusively());
        assert.equal(false, mquery().select({ name: 1 }).selectedExclusively());
        done();
      });
    });

    describe('returns true', function() {
      it('when any field has been excluded', function(done) {
        assert.equal(true, mquery().select('-name').selectedExclusively());
        assert.equal(true, mquery().select({ name: 0 }).selectedExclusively());
        assert.equal(true, mquery().select('-_id').selectedExclusively());
        assert.strictEqual(true, mquery().select('name bio -_id').selectedExclusively());
        assert.strictEqual(true, mquery().select({ name: 1, _id: 0 }).selectedExclusively());
        done();
      });
    });
  });

  describe('slice', function() {
    describe('with 0 args', function() {
      it('is chainable', function() {
        const m = mquery();
        assert.equal(m, m.slice());
      });
      it('is a noop', function() {
        const m = mquery().slice();
        assert.deepEqual(m._fields, undefined);
      });
    });

    describe('with 1 arg', function() {
      it('throws if not called after where()', function() {
        assert.throws(function() {
          mquery().slice(1);
        }, /must be used after where/);
        assert.doesNotThrow(function() {
          mquery().where('a').slice(1);
        });
      });
      it('that is a number', function() {
        const query = mquery();
        query.where('collection').slice(5);
        assert.deepEqual(query._fields, { collection: { $slice: 5 } });
      });
      it('that is an array', function() {
        const query = mquery();
        query.where('collection').slice([5, 10]);
        assert.deepEqual(query._fields, { collection: { $slice: [5, 10] } });
      });
      it('that is an object', function() {
        const query = mquery();
        query.slice({ collection: [5, 10] });
        assert.deepEqual(query._fields, { collection: { $slice: [5, 10] } });
      });
    });

    describe('with 2 args', function() {
      describe('and first is a number', function() {
        it('throws if not called after where', function() {
          assert.throws(function() {
            mquery().slice(2, 3);
          }, /must be used after where/);
        });
        it('does not throw if used after where', function() {
          const query = mquery();
          query.where('collection').slice(2, 3);
          assert.deepEqual(query._fields, { collection: { $slice: [2, 3] } });
        });
      });
      it('and first is not a number', function() {
        const query = mquery().slice('collection', [-5, 2]);
        assert.deepEqual(query._fields, { collection: { $slice: [-5, 2] } });
      });
    });

    describe('with 3 args', function() {
      it('works', function() {
        const query = mquery();
        query.slice('collection', 14, 10);
        assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
      });
    });

    noDistinct('slice');
    no('count', 'slice');
  });

  // options

  describe('sort', function() {
    describe('with 0 args', function() {
      it('chains', function() {
        const m = mquery();
        assert.equal(m, m.sort());
      });
      it('has no affect', function() {
        const m = mquery();
        assert.equal(m.options.sort, undefined);
      });
    });

    it('works', function() {
      let query = mquery();
      query.sort('a -c b');
      assert.deepEqual(query.options.sort, { a: 1, b: 1, c: -1 });

      query = mquery();
      query.sort({ a: 1, c: -1, b: 'asc', e: 'descending', f: 'ascending' });
      assert.deepEqual(query.options.sort, { a: 1, c: -1, b: 1, e: -1, f: 1 });

      query = mquery();
      query.sort([['a', -1], ['c', 1], ['b', 'desc'], ['e', 'ascending'], ['f', 'descending']]);
      assert.deepEqual(query.options.sort, [['a', -1], ['c', 1], ['b', -1], ['e', 1], ['f', -1]]);

      query = mquery();
      let e = undefined;
      try {
        query.sort([['a', 1], { b: 5 }]);
      } catch (err) {
        e = err;
      }
      assert.ok(e, 'uh oh. no error was thrown');
      assert.equal(e.message, 'Invalid sort() argument, must be array of arrays');

      query = mquery();
      e = undefined;

      try {
        query.sort('a', 1, 'c', -1, 'b', 1);
      } catch (err) {
        e = err;
      }
      assert.ok(e, 'uh oh. no error was thrown');
      assert.equal(e.message, 'Invalid sort() argument. Must be a string, object, or array.');
    });

    it('handles $meta sort options', function() {
      const query = mquery();
      query.sort({ score: { $meta: 'textScore' } });
      assert.deepEqual(query.options.sort, { score: { $meta: 'textScore' } });
    });

    it('array syntax', function() {
      const query = mquery();
      query.sort([['field', 1], ['test', -1]]);
      assert.deepEqual(query.options.sort, [['field', 1], ['test', -1]]);
    });

    it('throws with mixed array/object syntax', function() {
      const query = mquery();
      assert.throws(function() {
        query.sort({ field: 1 }).sort([['test', -1]]);
      }, /Can't mix sort syntaxes/);
      assert.throws(function() {
        query.sort([['field', 1]]).sort({ test: 1 });
      }, /Can't mix sort syntaxes/);
    });

    it('works with maps', function() {
      if (typeof Map === 'undefined') {
        return this.skip();
      }
      const query = mquery();
      query.sort(new Map().set('field', 1).set('test', -1));
      assert.deepEqual(query.options.sort, new Map().set('field', 1).set('test', -1));
    });

    // ASTRA: test sorting
    it('exec', async function() {
      await col.insertMany([{ name: 'exec', age: 1 }, { name: 'exec', age: 2 }]);

      let query = mquery(col).find().sort({ age: -1 });
      let res = await query;
      assert.deepEqual(res.map(doc => doc.age), [2, 1]);

      query = mquery(col).find().sort({ age: 1 });
      res = await query;
      assert.deepEqual(res.map(doc => doc.age), [1, 2]);
    })
  });

  function simpleOption(type, options) {
    describe(type, function() {
      it('sets the ' + type + ' option', function() {
        const m = mquery()[type](2);
        const optionName = options.name || type;
        assert.equal(2, m.options[optionName]);
      });
      it('is chainable', function() {
        const m = mquery();
        assert.equal(m[type](3), m);
      });

      if (!options.distinct) noDistinct(type);
      if (!options.count) no('count', type);
    });
  }

  const negated = {
    limit: { distinct: false, count: true },
    skip: { distinct: false, count: true },
    maxScan: { distinct: false, count: false },
    batchSize: { distinct: false, count: false },
    maxTime: { distinct: true, count: true, name: 'maxTimeMS' }
  };
  Object.keys(negated).forEach(function(key) {
    simpleOption(key, negated[key]);
  });

  describe('snapshot', function() {
    it('works', function() {
      let query;

      query = mquery();
      query.snapshot();
      assert.equal(true, query.options.snapshot);

      query = mquery();
      query.snapshot(true);
      assert.equal(true, query.options.snapshot);

      query = mquery();
      query.snapshot(false);
      assert.equal(false, query.options.snapshot);
    });
    noDistinct('snapshot');
    no('count', 'snapshot');
  });

  describe('hint', function() {
    it('accepts an object', function() {
      const query2 = mquery();
      query2.hint({ a: 1, b: -1 });
      assert.deepEqual(query2.options.hint, { a: 1, b: -1 });
    });

    it('accepts a string', function() {
      const query2 = mquery();
      query2.hint('a');
      assert.deepEqual(query2.options.hint, 'a');
    });

    it('rejects everything else', function() {
      assert.throws(function() {
        mquery().hint(['c']);
      }, /Invalid hint./);
      assert.throws(function() {
        mquery().hint(1);
      }, /Invalid hint./);
    });

    describe('does not have side affects', function() {
      it('on invalid arg', function() {
        const m = mquery();
        try {
          m.hint(1);
        } catch (err) {
          // ignore
        }
        assert.equal(undefined, m.options.hint);
      });
      it('on missing arg', function() {
        const m = mquery().hint();
        assert.equal(undefined, m.options.hint);
      });
    });

    noDistinct('hint');
  });

  describe('j', function() {
    it('works', function() {
      const m = mquery().j(true);
      assert.equal(true, m.options.j);
    });
  });

  describe('slaveOk', function() {
    it('works', function() {
      let query;

      query = mquery();
      query.slaveOk();
      assert.equal(true, query.options.slaveOk);

      query = mquery();
      query.slaveOk(true);
      assert.equal(true, query.options.slaveOk);

      query = mquery();
      query.slaveOk(false);
      assert.equal(false, query.options.slaveOk);
    });
  });

  describe('read', function() {
    it('sets associated readPreference option', function() {
      const m = mquery();
      m.read('p');
      assert.equal('primary', m.options.readPreference);
    });
    it('is chainable', function() {
      const m = mquery();
      assert.equal(m, m.read('sp'));
    });
  });

  describe('readConcern', function() {
    it('sets associated readConcern option', function() {
      let m;

      m = mquery();
      m.readConcern('s');
      assert.deepEqual({ level: 'snapshot' }, m.options.readConcern);

      m = mquery();
      m.r('local');
      assert.deepEqual({ level: 'local' }, m.options.readConcern);
    });
    it('is chainable', function() {
      const m = mquery();
      assert.equal(m, m.readConcern('lz'));
    });
  });

  describe('tailable', function() {
    it('works', function() {
      let query;

      query = mquery();
      query.tailable();
      assert.equal(true, query.options.tailable);

      query = mquery();
      query.tailable(true);
      assert.equal(true, query.options.tailable);

      query = mquery();
      query.tailable(false);
      assert.equal(false, query.options.tailable);
    });
    it('is chainable', function() {
      const m = mquery();
      assert.equal(m, m.tailable());
    });
    noDistinct('tailable');
    no('count', 'tailable');
  });

  describe('writeConcern', function() {
    it('sets associated writeConcern option', function() {
      let m;
      m = mquery();
      m.writeConcern('majority');
      assert.equal('majority', m.options.w);

      m = mquery();
      m.writeConcern('m'); // m is alias of majority
      assert.equal('majority', m.options.w);

      m = mquery();
      m.writeConcern(1);
      assert.equal(1, m.options.w);
    });
    it('accepts object', function() {
      let m;

      m = mquery().writeConcern({ w: 'm', j: true, wtimeout: 1000 });
      assert.equal('m', m.options.w); // check it does not convert m to majority
      assert.equal(true, m.options.j);
      assert.equal(1000, m.options.wtimeout);

      m = mquery().w('m').w({ j: false, wtimeout: 0 });
      assert.equal('majority', m.options.w);
      assert.strictEqual(false, m.options.j);
      assert.strictEqual(0, m.options.wtimeout);
    });
    it('is chainable', function() {
      const m = mquery();
      assert.equal(m, m.writeConcern('majority'));
    });
  });

  // query utilities

  describe('merge', function() {
    describe('with falsy arg', function() {
      it('returns itself', function() {
        const m = mquery();
        assert.equal(m, m.merge());
        assert.equal(m, m.merge(null));
        assert.equal(m, m.merge(0));
      });
    });
    describe('with an argument', function() {
      describe('that is not a query or plain object', function() {
        it('throws', function() {
          assert.throws(function() {
            mquery().merge([]);
          }, /Invalid argument/);
          assert.throws(function() {
            mquery().merge('merge');
          }, /Invalid argument/);
          assert.doesNotThrow(function() {
            mquery().merge({});
          }, /Invalid argument/);
        });
      });

      describe('that is a query', function() {
        it('merges conditions, field selection, and options', function() {
          const m = mquery({ x: 'hi' }, { select: 'x y', another: true });
          const n = mquery().merge(m);
          assert.deepEqual(n._conditions, m._conditions);
          assert.deepEqual(n._fields, m._fields);
          assert.deepEqual(n.options, m.options);
        });
        it('clones update arguments', function(done) {
          const original = { $set: { iTerm: true } };
          const m = mquery().updateOne(original);
          const n = mquery().merge(m);
          m.updateOne({ $set: { x: 2 } });
          assert.notDeepEqual(m._update, n._update);
          done();
        });
        it('is chainable', function() {
          const m = mquery({ x: 'hi' });
          const n = mquery();
          assert.equal(n, n.merge(m));
        });
      });

      describe('that is an object', function() {
        it('merges', function() {
          const m = { x: 'hi' };
          const n = mquery().merge(m);
          assert.deepEqual(n._conditions, { x: 'hi' });
        });
        it('clones update arguments', function(done) {
          const original = { $set: { iTerm: true } };
          const m = mquery().updateOne(original);
          const n = mquery().merge(original);
          m.updateOne({ $set: { x: 2 } });
          assert.notDeepEqual(m._update, n._update);
          done();
        });
        it('is chainable', function() {
          const m = { x: 'hi' };
          const n = mquery();
          assert.equal(n, n.merge(m));
        });
      });
    });
  });

  // queries

  describe('find', function() {
    describe('with no callback', function() {
      it('does not execute', function() {
        const m = mquery();
        assert.doesNotThrow(function() {
          m.find();
        });
        assert.doesNotThrow(function() {
          m.find({ x: 1 });
        });
      });
    });

    it('is chainable', function() {
      const m = mquery().find({ x: 1 }).find().find({ y: 2 });
      assert.deepEqual(m._conditions, { x: 1, y: 2 });
    });

    it('merges other queries', function() {
      const m = mquery({ name: 'mquery' });
      m.tailable();
      m.select('_id');
      const a = mquery().find(m);
      assert.deepEqual(a._conditions, m._conditions);
      assert.deepEqual(a.options, m.options);
      assert.deepEqual(a._fields, m._fields);
    });

    describe('executes', function() {
      before(function(done) {
        col.insertOne({ name: 'mquery' }, done);
      });

      after(function(done) {
        col.remove({ name: 'mquery' }, done);
      });

      it('when criteria is passed with a callback', function(done) {
        mquery(col).find({ name: 'mquery' }, function(err, docs) {
          assert.ifError(err);
          assert.equal(1, docs.length);
          done();
        });
      });
      it('when Query is passed with a callback', function(done) {
        const m = mquery({ name: 'mquery' });
        mquery(col).find(m, function(err, docs) {
          assert.ifError(err);
          assert.equal(1, docs.length);
          done();
        });
      });
      it('when just a callback is passed', function(done) {
        mquery({ name: 'mquery' }).collection(col).find(function(err, docs) {
          assert.ifError(err);
          assert.equal(1, docs.length);
          done();
        });
      });
    });
  });

  describe('findOne', function() {
    describe('with no callback', function() {
      it('does not execute', function() {
        const m = mquery();
        assert.doesNotThrow(function() {
          m.findOne();
        });
        assert.doesNotThrow(function() {
          m.findOne({ x: 1 });
        });
      });
    });

    it('is chainable', function() {
      const m = mquery();
      const n = m.findOne({ x: 1 }).findOne().findOne({ y: 2 });
      assert.equal(m, n);
      assert.deepEqual(m._conditions, { x: 1, y: 2 });
      assert.equal('findOne', m.op);
    });

    it('merges other queries', function() {
      const m = mquery({ name: 'mquery' });
      m.read('nearest');
      m.select('_id');
      const a = mquery().findOne(m);
      assert.deepEqual(a._conditions, m._conditions);
      assert.deepEqual(a.options, m.options);
      assert.deepEqual(a._fields, m._fields);
    });

    describe('executes', function() {
      before(function(done) {
        col.insertOne({ name: 'mquery findone' }, done);
      });

      after(function(done) {
        col.remove({ name: 'mquery findone' }, done);
      });

      it('when criteria is passed with a callback', function(done) {
        mquery(col).findOne({ name: 'mquery findone' }, function(err, doc) {
          assert.ifError(err);
          assert.ok(doc);
          assert.equal('mquery findone', doc.name);
          done();
        });
      });
      it('when Query is passed with a callback', function(done) {
        const m = mquery(col).where({ name: 'mquery findone' });
        mquery(col).findOne(m, function(err, doc) {
          assert.ifError(err);
          assert.ok(doc);
          assert.equal('mquery findone', doc.name);
          done();
        });
      });
      it('when just a callback is passed', function(done) {
        mquery({ name: 'mquery findone' }).collection(col).findOne(function(err, doc) {
          assert.ifError(err);
          assert.ok(doc);
          assert.equal('mquery findone', doc.name);
          done();
        });
      });
    });
  });

  describe('count', function() {
    describe('with no callback', function() {
      it('does not execute', function() {
        const m = mquery();
        assert.doesNotThrow(function() {
          m.count();
        });
        assert.doesNotThrow(function() {
          m.count({ x: 1 });
        });
      });
    });

    it('is chainable', function() {
      const m = mquery();
      const n = m.count({ x: 1 }).count().count({ y: 2 });
      assert.equal(m, n);
      assert.deepEqual(m._conditions, { x: 1, y: 2 });
      assert.equal('count', m.op);
    });

    it('merges other queries', function() {
      const m = mquery({ name: 'mquery' });
      m.read('nearest');
      m.select('_id');
      const a = mquery().count(m);
      assert.deepEqual(a._conditions, m._conditions);
      assert.deepEqual(a.options, m.options);
      assert.deepEqual(a._fields, m._fields);
    });

    describe('executes', function() {
      before(function(done) {
        col.insertOne({ name: 'mquery count' }, done);
      });

      after(function(done) {
        col.remove({ name: 'mquery count' }, done);
      });

      it('when criteria is passed with a callback', function(done) {
        mquery(col).count({ name: 'mquery count' }, function(err, count) {
          assert.ifError(err);
          assert.ok(count);
          assert.ok(1 === count);
          done();
        });
      });
      it('when Query is passed with a callback', function(done) {
        const m = mquery({ name: 'mquery count' });
        mquery(col).count(m, function(err, count) {
          assert.ifError(err);
          assert.ok(count);
          assert.ok(1 === count);
          done();
        });
      });
      it('when just a callback is passed', function(done) {
        mquery({ name: 'mquery count' }).collection(col).count(function(err, count) {
          assert.ifError(err);
          assert.ok(1 === count);
          done();
        });
      });
    });

    describe('validates its option', function() {
      it('sort', function(done) {
        assert.doesNotThrow(function() {
          mquery().sort('x').count();
        });
        done();
      });

      it('select', function(done) {
        assert.throws(function() {
          mquery().select('x').count();
        }, /field selection and slice cannot be used with count/);
        done();
      });

      it('slice', function(done) {
        assert.throws(function() {
          mquery().where('x').slice(-3).count();
        }, /field selection and slice cannot be used with count/);
        done();
      });

      it('limit', function(done) {
        assert.doesNotThrow(function() {
          mquery().limit(3).count();
        });
        done();
      });

      it('skip', function(done) {
        assert.doesNotThrow(function() {
          mquery().skip(3).count();
        });
        done();
      });

      it('batchSize', function(done) {
        assert.throws(function() {
          mquery({}, { batchSize: 3 }).count();
        }, /batchSize cannot be used with count/);
        done();
      });

      it('maxScan', function(done) {
        assert.throws(function() {
          mquery().maxScan(300).count();
        }, /maxScan cannot be used with count/);
        done();
      });

      it('snapshot', function(done) {
        assert.throws(function() {
          mquery().snapshot().count();
        }, /snapshot cannot be used with count/);
        done();
      });

      it('tailable', function(done) {
        assert.throws(function() {
          mquery().tailable().count();
        }, /tailable cannot be used with count/);
        done();
      });
    });
  });

  describe('distinct', function() {
    describe('with no callback', function() {
      it('does not execute', function() {
        const m = mquery();
        assert.doesNotThrow(function() {
          m.distinct();
        });
        assert.doesNotThrow(function() {
          m.distinct('name');
        });
        assert.doesNotThrow(function() {
          m.distinct({ name: 'mquery distinct' });
        });
        assert.doesNotThrow(function() {
          m.distinct({ name: 'mquery distinct' }, 'name');
        });
      });
    });

    it('is chainable', function() {
      const m = mquery({ x: 1 }).distinct('name');
      const n = m.distinct({ y: 2 });
      assert.equal(m, n);
      assert.deepEqual(n._conditions, { x: 1, y: 2 });
      assert.equal('name', n._distinct);
      assert.equal('distinct', n.op);
    });

    it('overwrites field', function() {
      const m = mquery({ name: 'mquery' }).distinct('name');
      m.distinct('rename');
      assert.equal(m._distinct, 'rename');
      m.distinct({ x: 1 }, 'renamed');
      assert.equal(m._distinct, 'renamed');
    });

    it('merges other queries', function() {
      const m = mquery().distinct({ name: 'mquery' }, 'age');
      m.read('nearest');
      const a = mquery().distinct(m);
      assert.deepEqual(a._conditions, m._conditions);
      assert.deepEqual(a.options, m.options);
      assert.deepEqual(a._fields, m._fields);
      assert.deepEqual(a._distinct, m._distinct);
    });

    describe('executes', function() {
      before(function(done) {
        col.insertOne({ name: 'mquery distinct', age: 1 }, done);
      });

      after(function(done) {
        col.remove({ name: 'mquery distinct' }, done);
      });

      it('when distinct arg is passed with a callback', function(done) {
        mquery(col).distinct('distinct', function(err, doc) {
          assert.ifError(err);
          assert.ok(doc);
          done();
        });
      });
      describe('when criteria is passed with a callback', function() {
        it('if distinct arg was declared', function(done) {
          mquery(col).distinct('age').distinct({ name: 'mquery distinct' }, function(err, doc) {
            assert.ifError(err);
            assert.ok(doc);
            done();
          });
        });
        it('but not if distinct arg was not declared', function() {
          assert.throws(function() {
            mquery(col).distinct({ name: 'mquery distinct' }, function() {});
          }, /No value for `distinct`/);
        });
      });
      describe('when Query is passed with a callback', function() {
        const m = mquery({ name: 'mquery distinct' });
        it('if distinct arg was declared', function(done) {
          mquery(col).distinct('age').distinct(m, function(err, doc) {
            assert.ifError(err);
            assert.ok(doc);
            done();
          });
        });
        it('but not if distinct arg was not declared', function() {
          assert.throws(function() {
            mquery(col).distinct(m, function() {});
          }, /No value for `distinct`/);
        });
      });
      describe('when just a callback is passed', function() {
        it('if distinct arg was declared', function(done) {
          const m = mquery({ name: 'mquery distinct' });
          m.collection(col);
          m.distinct('age');
          m.distinct(function(err, doc) {
            assert.ifError(err);
            assert.ok(doc);
            done();
          });
        });
        it('but not if no distinct arg was declared', function() {
          const m = mquery();
          m.collection(col);
          assert.throws(function() {
            m.distinct(function() {});
          }, /No value for `distinct`/);
        });
      });
    });

    describe('validates its option', function() {
      it('sort', function(done) {
        assert.throws(function() {
          mquery().sort('x').distinct();
        }, /sort cannot be used with distinct/);
        done();
      });

      it('select', function(done) {
        assert.throws(function() {
          mquery().select('x').distinct();
        }, /field selection and slice cannot be used with distinct/);
        done();
      });

      it('slice', function(done) {
        assert.throws(function() {
          mquery().where('x').slice(-3).distinct();
        }, /field selection and slice cannot be used with distinct/);
        done();
      });

      it('limit', function(done) {
        assert.throws(function() {
          mquery().limit(3).distinct();
        }, /limit cannot be used with distinct/);
        done();
      });

      it('skip', function(done) {
        assert.throws(function() {
          mquery().skip(3).distinct();
        }, /skip cannot be used with distinct/);
        done();
      });

      it('batchSize', function(done) {
        assert.throws(function() {
          mquery({}, { batchSize: 3 }).distinct();
        }, /batchSize cannot be used with distinct/);
        done();
      });

      it('maxScan', function(done) {
        assert.throws(function() {
          mquery().maxScan(300).distinct();
        }, /maxScan cannot be used with distinct/);
        done();
      });

      it('snapshot', function(done) {
        assert.throws(function() {
          mquery().snapshot().distinct();
        }, /snapshot cannot be used with distinct/);
        done();
      });

      it('hint', function(done) {
        assert.throws(function() {
          mquery().hint({ x: 1 }).distinct();
        }, /hint cannot be used with distinct/);
        done();
      });

      it('tailable', function(done) {
        assert.throws(function() {
          mquery().tailable().distinct();
        }, /tailable cannot be used with distinct/);
        done();
      });
    });
  });

  describe('update', function() {
    describe('with no callback', function() {
      it('does not execute', function() {
        const m = mquery();
        assert.doesNotThrow(function() {
          m.updateOne({ name: 'old' }, { name: 'updated' }, { multi: true });
        });
        assert.doesNotThrow(function() {
          m.updateOne({ name: 'old' }, { name: 'updated' });
        });
        assert.doesNotThrow(function() {
          m.updateOne({ name: 'updated' });
        });
        assert.doesNotThrow(function() {
          m.updateOne();
        });
      });
    });

    it('is chainable', function() {
      const m = mquery({ x: 1 }).updateOne({ y: 2 });
      const n = m.where({ y: 2 });
      assert.equal(m, n);
      assert.deepEqual(n._conditions, { x: 1, y: 2 });
      assert.deepEqual({ y: 2 }, n._update);
      assert.equal('updateOne', n.op);
    });

    it('merges update doc arg', function() {
      const a = [1, 2];
      const m = mquery().where({ name: 'mquery' }).updateOne({ x: 'stuff', a: a });
      m.updateOne({ z: 'stuff' });
      assert.deepEqual(m._update, { z: 'stuff', x: 'stuff', a: a });
      assert.deepEqual(m._conditions, { name: 'mquery' });
      assert.ok(!m.options.overwrite);
      m.updateOne({}, { z: 'renamed' }, { overwrite: true });
      assert.ok(m.options.overwrite === true);
      assert.deepEqual(m._conditions, { name: 'mquery' });
      assert.deepEqual(m._update, { z: 'renamed', x: 'stuff', a: a });
      a.push(3);
      assert.notDeepEqual(m._update, { z: 'renamed', x: 'stuff', a: a });
    });

    describe('executes', function() {
      let id;
      before(function(done) {
        col.insertOne({ name: 'mquery update', age: 1 }, function(err, res) {
          id = res.insertedId;
          done();
        });
      });

      after(function(done) {
        col.remove({ _id: id }, done);
      });

      describe('when conds + doc + opts + callback passed', function() {
        it('works', function(done) {
          const m = mquery(col).where({ _id: id });
          m.updateOne({}, { name: 'Sparky' }, {}, function(err, res) {
            assert.ifError(err);
            assert.equal(res.modifiedCount, 1);
            m.findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.name, 'Sparky');
              done();
            });
          });
        });
      });

      describe('when conds + doc + callback passed', function() {
        it('works', function(done) {
          const m = mquery(col).updateOne({ _id: id }, { name: 'fairgrounds' }, function(err, num) {
            assert.ifError(err);
            assert.ok(1, num);
            m.findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.name, 'fairgrounds');
              done();
            });
          });
        });
      });

      describe('when doc + callback passed', function() {
        it('works', function(done) {
          const m = mquery(col).where({ _id: id }).updateOne({ name: 'changed' }, function(err, num) {
            assert.ifError(err);
            assert.ok(1, num);
            m.findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.name, 'changed');
              done();
            });
          });
        });
      });

      describe('when just callback passed', function() {
        it('works', function(done) {
          const m = mquery(col).where({ _id: id });
          m.updateOne({ name: 'Frankenweenie' });
          m.updateOne(function(err, res) {
            assert.ifError(err);
            assert.equal(res.modifiedCount, 1);
            m.findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.name, 'Frankenweenie');
              done();
            });
          });
        });
      });

      describe('without a callback', function() {
        it('when forced by exec()', function(done) {
          const m = mquery(col).where({ _id: id });
          m.setOptions({ w: 'majority' });
          m.updateOne({ name: 'forced' });

          const update = m._collection.update;
          m._collection.updateOne = function(conds, doc, opts) {
            m._collection.update = update;

            assert.equal(opts.w, 'majority');
            assert.equal('forced', doc.$set.name);
            done();
          };

          m.exec();
        });
      });

      describe('except when update doc is empty and missing overwrite flag', function() {
        it('works', function(done) {
          const m = mquery(col).where({ _id: id });
          m.updateOne({}, function(err, num) {
            assert.ifError(err);
            assert.ok(0 === num);
            setTimeout(function() {
              m.findOne(function(err, doc) {
                assert.ifError(err);
                assert.equal(3, mquery.utils.keys(doc).length);
                assert.equal(id, doc._id.toString());
                assert.equal('Frankenweenie', doc.name);
                done();
              });
            }, 300);
          });
        });
      });

      describe('when boolean (true) - exec()', function() {
        it('works', function(done) {
          const m = mquery(col).where({ _id: id });
          m.updateOne({ name: 'bool' }).updateOne(true);
          setTimeout(function() {
            m.findOne(function(err, doc) {
              assert.ifError(err);
              assert.ok(doc);
              assert.equal('bool', doc.name);
              done();
            });
          }, 300);
        });
      });
    });
  });

  describe('remove', function() {
    describe('with 0 args', function() {
      const name = 'remove: no args test';
      before(function(done) {
        col.insertOne({ name: name }, done);
      });
      after(function(done) {
        col.remove({ name: name }, done);
      });

      it('does not execute', function(done) {
        const remove = col.remove;
        col.remove = function() {
          col.remove = remove;
          done(new Error('remove executed!'));
        };

        mquery(col).where({ name: name }).remove();
        setTimeout(function() {
          col.remove = remove;
          done();
        }, 10);
      });

      it('chains', function() {
        const m = mquery();
        assert.equal(m, m.remove());
      });
    });

    describe('with 1 argument', function() {
      const name = 'remove: 1 arg test';
      before(function(done) {
        col.insertOne({ name: name }, done);
      });
      after(function(done) {
        col.remove({ name: name }, done);
      });

      describe('that is a', function() {
        it('plain object', function() {
          const m = mquery(col).remove({ name: 'Whiskers' });
          m.remove({ color: '#fff' });
          assert.deepEqual({ name: 'Whiskers', color: '#fff' }, m._conditions);
        });

        it('query', function() {
          const q = mquery({ color: '#fff' });
          const m = mquery(col).remove({ name: 'Whiskers' });
          m.remove(q);
          assert.deepEqual({ name: 'Whiskers', color: '#fff' }, m._conditions);
        });

        it('function', function(done) {
          mquery(col).where({ name: name }).remove(function(err) {
            assert.ifError(err);
            mquery(col).findOne({ name: name }, function(err, doc) {
              assert.ifError(err);
              assert.equal(null, doc);
              done();
            });
          });
        });

        it('boolean (true) - execute', function(done) {
          col.insertOne({ name: name }, function(err) {
            assert.ifError(err);
            mquery(col).findOne({ name: name }, function(err, doc) {
              assert.ifError(err);
              assert.ok(doc);
              mquery(col).remove(true);
              setTimeout(function() {
                mquery(col).find(function(err, docs) {
                  assert.ifError(err);
                  assert.ok(docs);
                  assert.equal(0, docs.length);
                  done();
                });
              }, 300);
            });
          });
        });
      });
    });

    describe('with 2 arguments', function() {
      const name = 'remove: 2 arg test';
      beforeEach(async function() {
        await col.deleteMany({});

        await col.insertMany([{ name: 'shelly' }, { name: name }]);

        const docs = await mquery(col).find();
        assert.equal(docs.length, 2);
      });

      describe('plain object + callback', function() {
        it('works', function(done) {
          mquery(col).remove({ name: name }, function(err) {
            assert.ifError(err);
            mquery(col).find(function(err, docs) {
              assert.ifError(err);
              assert.ok(docs);
              assert.equal(1, docs.length);
              assert.equal('shelly', docs[0].name);
              done();
            });
          });
        });
      });

      describe('mquery + callback', function() {
        it('works', function(done) {
          const m = mquery({ name: name });
          mquery(col).remove(m, function(err) {
            assert.ifError(err);
            mquery(col).find(function(err, docs) {
              assert.ifError(err);
              assert.ok(docs);
              assert.equal(1, docs.length);
              assert.equal('shelly', docs[0].name);
              done();
            });
          });
        });
      });
    });
  });

  function validateFindAndModifyOptions(method) {
    describe('validates its option', function() {
      it('sort', function(done) {
        assert.doesNotThrow(function() {
          mquery().sort('x')[method]();
        });
        done();
      });

      it('select', function(done) {
        assert.doesNotThrow(function() {
          mquery().select('x')[method]();
        });
        done();
      });

      it('limit', function(done) {
        assert.throws(function() {
          mquery().limit(3)[method]();
        }, new RegExp('limit cannot be used with ' + method));
        done();
      });

      it('skip', function(done) {
        assert.throws(function() {
          mquery().skip(3)[method]();
        }, new RegExp('skip cannot be used with ' + method));
        done();
      });

      it('batchSize', function(done) {
        assert.throws(function() {
          mquery({}, { batchSize: 3 })[method]();
        }, new RegExp('batchSize cannot be used with ' + method));
        done();
      });

      it('maxScan', function(done) {
        assert.throws(function() {
          mquery().maxScan(300)[method]();
        }, new RegExp('maxScan cannot be used with ' + method));
        done();
      });

      it('snapshot', function(done) {
        assert.throws(function() {
          mquery().snapshot()[method]();
        }, new RegExp('snapshot cannot be used with ' + method));
        done();
      });

      it('tailable', function(done) {
        assert.throws(function() {
          mquery().tailable()[method]();
        }, new RegExp('tailable cannot be used with ' + method));
        done();
      });
    });
  }

  describe('findOneAndUpdate', function() {
    let name = 'findOneAndUpdate + fn';

    validateFindAndModifyOptions('findOneAndUpdate');

    describe('with 0 args', function() {
      it('makes no changes', function() {
        const m = mquery();
        const n = m.findOneAndUpdate();
        assert.deepEqual(m, n);
      });
    });
    describe('with 1 arg', function() {
      describe('that is an object', function() {
        it('updates the doc', function() {
          const m = mquery();
          const n = m.findOneAndUpdate({ $set: { name: '1 arg' } });
          assert.deepEqual(n._update, { $set: { name: '1 arg' } });
        });
      });
      describe('that is a query', function() {
        it('updates the doc', function() {
          const m = mquery({ name: name }).updateOne({ x: 1 });
          const n = mquery().findOneAndUpdate(m);
          assert.deepEqual(n._update, { x: 1 });
        });
      });
      it('that is a function', function(done) {
        col.insertOne({ name: name }, function(err) {
          assert.ifError(err);
          const m = mquery({ name: name }).collection(col);
          name = '1 arg';
          const n = m.updateOne({ $set: { name: name } }).setOptions({ returnDocument: 'after' });
          n.findOneAndUpdate(function(err, res) {
            assert.ifError(err);
            assert.ok(res.value);
            assert.equal(res.value.name, name);
            done();
          });
        });
      });
    });
    describe('with 2 args', function() {
      it('conditions + update', function() {
        const m = mquery(col);
        m.findOneAndUpdate({ name: name }, { age: 100 });
        assert.deepEqual({ name: name }, m._conditions);
        assert.deepEqual({ age: 100 }, m._update);
      });
      it('query + update', function() {
        const n = mquery({ name: name });
        const m = mquery(col);
        m.findOneAndUpdate(n, { age: 100 });
        assert.deepEqual({ name: name }, m._conditions);
        assert.deepEqual({ age: 100 }, m._update);
      });
      it('update + callback', function(done) {
        const m = mquery(col).where({ name: name });
        m.findOneAndUpdate({}, { $inc: { age: 10 } }, { returnDocument: 'after' }, function(err, res) {
          assert.ifError(err);
          assert.equal(10, res.value.age);
          done();
        });
      });
    });
    describe('with 3 args', function() {
      it('conditions + update + options', function() {
        const m = mquery();
        const n = m.findOneAndUpdate({ name: name }, { works: true }, { returnDocument: 'before' });
        assert.deepEqual({ name: name }, n._conditions);
        assert.deepEqual({ works: true }, n._update);
        assert.deepEqual({ returnDocument: 'before' }, n.options);
      });
      it('conditions + update + callback', function(done) {
        const m = mquery(col);
        m.findOneAndUpdate({ name: name }, { works: true }, { returnDocument: 'after' }, function(err, res) {
          assert.ifError(err);
          assert.ok(res.value);
          assert.equal(name, res.value.name);
          assert.ok(true === res.value.works);
          done();
        });
      });
    });
    describe('with 4 args', function() {
      it('conditions + update + options + callback', function(done) {
        const m = mquery(col);
        m.findOneAndUpdate({ name: name }, { works: false }, {}, function(err, res) {
          assert.ifError(err);
          assert.ok(res.value);
          assert.equal(name, res.value.name);
          assert.ok(true === res.value.works);
          done();
        });
      });
    });
  });

  describe('findOneAndRemove', function() {
    let name = 'findOneAndRemove';

    validateFindAndModifyOptions('findOneAndRemove');

    describe('with 0 args', function() {
      it('makes no changes', function() {
        const m = mquery();
        const n = m.findOneAndRemove();
        assert.deepEqual(m, n);
      });
    });
    describe('with 1 arg', function() {
      describe('that is an object', function() {
        it('updates the doc', function() {
          const m = mquery();
          const n = m.findOneAndRemove({ name: '1 arg' });
          assert.deepEqual(n._conditions, { name: '1 arg' });
        });
      });
      describe('that is a query', function() {
        it('updates the doc', function() {
          const m = mquery({ name: name });
          const n = m.findOneAndRemove(m);
          assert.deepEqual(n._conditions, { name: name });
        });
      });
      it('that is a function', function(done) {
        col.insertOne({ name: name }, function(err) {
          assert.ifError(err);
          const m = mquery({ name: name }).collection(col);
          m.findOneAndRemove(function(err, res) {
            assert.ifError(err);
            assert.ok(res.value);
            assert.equal(name, res.value.name);
            done();
          });
        });
      });
    });
    describe('with 2 args', function() {
      it('conditions + options', function() {
        const m = mquery(col);
        m.findOneAndRemove({ name: name }, { returnDocument: 'after' });
        assert.deepEqual({ name: name }, m._conditions);
        assert.deepEqual({ returnDocument: 'after' }, m.options);
      });
      it('query + options', function() {
        const n = mquery({ name: name });
        const m = mquery(col);
        m.findOneAndRemove(n, { sort: { x: 1 } });
        assert.deepEqual({ name: name }, m._conditions);
        assert.deepEqual({ sort: { x: 1 } }, m.options);
      });
      it('conditions + callback', function(done) {
        col.insertOne({ name: name }, function(err) {
          assert.ifError(err);
          const m = mquery(col);
          m.findOneAndRemove({ name: name }, function(err, res) {
            assert.ifError(err);
            assert.equal(name, res.value.name);
            done();
          });
        });
      });
      it('query + callback', function(done) {
        col.insertOne({ name: name }, function(err) {
          assert.ifError(err);
          const n = mquery({ name: name });
          const m = mquery(col);
          m.findOneAndRemove(n, function(err, res) {
            assert.ifError(err);
            assert.equal(name, res.value.name);
            done();
          });
        });
      });
    });
    describe('with 3 args', function() {
      it('conditions + options + callback', function(done) {
        name = 'findOneAndRemove + conds + options + cb';
        col.insertMany([{ name: name }, { name: 'a' }], function(err) {
          assert.ifError(err);
          const m = mquery(col);
          m.findOneAndRemove({ name: name }, { sort: { name: 1 } }, function(err, res) {
            assert.ifError(err);
            assert.ok(res.value);
            assert.equal(name, res.value.name);
            done();
          });
        });
      });
    });
  });

  describe('exec', function() {
    beforeEach(function(done) {
      col.insertMany([{ name: 'exec', age: 1 }, { name: 'exec', age: 2 }], done);
    });

    afterEach(function(done) {
      mquery(col).remove(done);
    });

    it('requires an op', function() {
      assert.throws(function() {
        mquery().exec();
      }, /Missing query type/);
    });

    describe('find', function() {
      it('works', function(done) {
        const m = mquery(col).find({ name: 'exec' });
        m.exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(2, docs.length);
          done();
        });
      });

      it('works with readPreferences', function(done) {
        const m = mquery(col).find({ name: 'exec' });
        try {
          const ReadPreference = require('mongodb').ReadPreference;
          const rp = new ReadPreference('primary');
          m.read(rp);
        } catch (e) {
          done(e.code === 'MODULE_NOT_FOUND' ? null : e);
          return;
        }
        m.exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(2, docs.length);
          done();
        });
      });

      it('works with hint', function(done) {
        mquery(col).hint({ _id: 1 }).find({ name: 'exec' }).exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(2, docs.length);

          mquery(col).hint('_id_').find({ age: 1 }).exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(1, docs.length);
            done();
          });
        });
      });

      it('works with readConcern', function(done) {
        const m = mquery(col).find({ name: 'exec' });
        m.readConcern('l');
        m.exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(2, docs.length);
          done();
        });
      });

      it('works with collation', function(done) {
        const m = mquery(col).find({ name: 'EXEC' });
        m.collation({ locale: 'en_US', strength: 1 });
        m.exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(2, docs.length);
          done();
        });
      });
    });

    it('findOne', function(done) {
      const m = mquery(col).findOne({ age: 2 });
      m.exec(function(err, doc) {
        assert.ifError(err);
        assert.equal(2, doc.age);
        done();
      });
    });

    it('count', function(done) {
      const m = mquery(col).count({ name: 'exec' });
      m.exec(function(err, count) {
        assert.ifError(err);
        assert.equal(2, count);
        done();
      });
    });

    it('distinct', function(done) {
      const m = mquery({ name: 'exec' });
      m.collection(col);
      m.distinct('age');
      m.exec(function(err, array) {
        assert.ifError(err);
        assert.ok(Array.isArray(array));
        assert.equal(2, array.length);
        assert(~array.indexOf(1));
        assert(~array.indexOf(2));
        done();
      });
    });

    describe('update', function() {
      describe('updateMany', function() {
        it('works', function(done) {
          mquery(col).updateMany({ name: 'exec' }, { name: 'test' }).
            exec(function(error) {
              assert.ifError(error);
              mquery(col).count({ name: 'test' }).exec(function(error, res) {
                assert.ifError(error);
                assert.equal(res, 2);
                done();
              });
            });
        });
        it('works with write concern', function(done) {
          mquery(col).updateMany({ name: 'exec' }, { name: 'test' })
            .w(1).j(true).wtimeout(1000)
            .exec(function(error) {
              assert.ifError(error);
              mquery(col).count({ name: 'test' }).exec(function(error, res) {
                assert.ifError(error);
                assert.equal(res, 2);
                done();
              });
            });
        });
      });

      describe('updateOne', function() {
        it('works', function(done) {
          mquery(col).updateOne({ name: 'exec' }, { name: 'test' }).
            exec(function(error) {
              assert.ifError(error);
              mquery(col).count({ name: 'test' }).exec(function(error, res) {
                assert.ifError(error);
                assert.equal(res, 1);
                done();
              });
            });
        });
      });

      describe('replaceOne', function() {
        it('works', function(done) {
          mquery(col).replaceOne({ name: 'exec' }, { name: 'test' }).
            exec(function(error) {
              assert.ifError(error);
              mquery(col).findOne({ name: 'test' }).exec(function(error, res) {
                assert.ifError(error);
                assert.equal(res.name, 'test');
                assert.ok(res.age == null);
                done();
              });
            });
        });
      });
    });

    describe('remove', function() {
      it('with a callback', function(done) {
        const m = mquery(col).where({ age: 2 }).remove();
        m.exec(function(err, res) {
          assert.ifError(err);
          assert.equal(1, res.deletedCount);
          done();
        });
      });

      it('without a callback', function(done) {
        const m = mquery(col).where({ age: 1 }).remove();
        m.exec();

        setTimeout(function() {
          mquery(col).where('name', 'exec').count(function(err, num) {
            assert.equal(1, num);
            done();
          });
        }, 200);
      });
    });

    describe('deleteOne', function() {
      it('with a callback', function(done) {
        const m = mquery(col).where({ age: { $gte: 0 } }).deleteOne();
        m.exec(function(err, res) {
          assert.ifError(err);
          assert.equal(res.deletedCount, 1);
          done();
        });
      });

      it('with justOne set', function(done) {
        const m = mquery(col).where({ age: { $gte: 0 } }).
          // Should ignore `justOne`
          setOptions({ justOne: false }).
          deleteOne();
        m.exec(function(err, res) {
          assert.ifError(err);
          assert.equal(res.deletedCount, 1);
          done();
        });
      });
    });

    describe('deleteMany', function() {
      it('with a callback', function(done) {
        const m = mquery(col).where({ age: { $gte: 0 } }).deleteMany();
        m.exec(function(err, res) {
          assert.ifError(err);
          assert.equal(res.deletedCount, 2);
          done();
        });
      });
    });

    describe('findOneAndUpdate', function() {
      it('with a callback', function(done) {
        const m = mquery(col);
        m.findOneAndUpdate({ name: 'exec', age: 1 }, { $set: { name: 'findOneAndUpdate' } }, { returnDocument: 'after' });
        m.exec(function(err, res) {
          assert.ifError(err);
          assert.equal('findOneAndUpdate', res.value.name);
          done();
        });
      });
    });

    describe('findOneAndRemove', function() {
      it('with a callback', function(done) {
        const m = mquery(col);
        m.findOneAndRemove({ name: 'exec', age: 2 });
        m.exec(function(err, res) {
          assert.ifError(err);
          assert.equal('exec', res.value.name);
          assert.equal(2, res.value.age);
          mquery(col).count({ name: 'exec' }, function(err, num) {
            assert.ifError(err);
            assert.equal(1, num);
            done();
          });
        });
      });
    });
  });

  describe('setTraceFunction', function() {
    beforeEach(function(done) {
      col.insertMany([{ name: 'trace', age: 93 }], done);
    });

    it('calls trace function when executing query', function(done) {
      const m = mquery(col);

      let resultTraceCalled;

      m.setTraceFunction(function(method, queryInfo) {
        try {
          assert.equal('findOne', method);
          assert.equal('trace', queryInfo.conditions.name);
        } catch (e) {
          done(e);
        }

        return function(err, result, millis) {
          try {
            assert.equal(93, result.age);
            assert.ok(typeof millis === 'number');
          } catch (e) {
            done(e);
          }
          resultTraceCalled = true;
        };
      });

      m.findOne({ name: 'trace' }, function(err, doc) {
        assert.ifError(err);
        assert.equal(resultTraceCalled, true);
        assert.equal(93, doc.age);
        done();
      });
    });

    it('inherits trace function when calling toConstructor', function(done) {
      function traceFunction() { return function() {}; }

      const tracedQuery = mquery().setTraceFunction(traceFunction).toConstructor();

      const query = tracedQuery();
      assert.equal(traceFunction, query._traceFunction);

      done();
    });
  });

  describe('thunk', function() {
    it('returns a function', function(done) {
      assert.equal('function', typeof mquery().thunk());
      done();
    });

    it('passes the fn arg to `exec`', function(done) {
      function cb() {}
      const m = mquery();

      m.exec = function testing(fn) {
        assert.equal(this, m);
        assert.equal(cb, fn);
        done();
      };

      m.thunk()(cb);
    });
  });

  describe('then', function() {
    before(function(done) {
      col.insertMany([{ name: 'then', age: 1 }, { name: 'then', age: 2 }], done);
    });

    after(function(done) {
      mquery(col).remove({ name: 'then' }).exec(done);
    });

    it('returns a promise A+ compat object', function(done) {
      const m = mquery(col).find();
      assert.equal('function', typeof m.then);
      done();
    });

    it('creates a promise that is resolved on success', function(done) {
      const promise = mquery(col).count({ name: 'then' }).then();
      promise.then(function(count) {
        assert.equal(2, count);
        done();
      }, done);
    });

    it('supports exec() cb being called synchronously #66', function(done) {
      const query = mquery(col).count({ name: 'then' });
      query.exec = function(cb) {
        cb(null, 66);
      };

      query.then(success, done);
      function success(count) {
        assert.equal(66, count);
        done();
      }
    });
  });

  describe('stream', function() {
    before(function(done) {
      col.insertMany([{ name: 'stream', age: 1 }, { name: 'stream', age: 2 }], done);
    });

    after(function(done) {
      mquery(col).remove({ name: 'stream' }).exec(done);
    });

    describe('throws', function() {
      describe('if used with non-find operations', function() {
        const ops = ['update', 'findOneAndUpdate', 'remove', 'count', 'distinct'];

        ops.forEach(function(op) {
          assert.throws(function() {
            mquery(col)[op]().stream();
          });
        });
      });
    });

    it('returns a stream', function(done) {
      const stream = mquery(col).find({ name: 'stream' }).cursor().stream();
      let count = 0;
      let err;

      stream.on('data', function(doc) {
        assert.equal('stream', doc.name);
        ++count;
      });

      stream.on('error', function(er) {
        err = er;
      });

      stream.on('end', function() {
        if (err) return done(err);
        assert.equal(2, count);
        done();
      });
    });
  });

  function noDistinct(type) {
    it('cannot be used with distinct()', function(done) {
      assert.throws(function() {
        mquery().distinct('name')[type](4);
      }, new RegExp(type + ' cannot be used with distinct'));
      done();
    });
  }

  function no(method, type) {
    it('cannot be used with ' + method + '()', function(done) {
      assert.throws(function() {
        mquery()[method]()[type](4);
      }, new RegExp(type + ' cannot be used with ' + method));
      done();
    });
  }

  // query internal

  describe('_updateForExec', function() {
    it('returns a clone of the update object with same key order #19', function(done) {
      const update = {};
      update.$push = { n: { $each: [{ x: 10 }], $slice: -1, $sort: { x: 1 } } };

      const q = mquery().updateOne({ x: 1 }, update);

      // capture original key order
      const order = [];
      let key;
      for (key in q._update.$push.n) {
        order.push(key);
      }

      // compare output
      const doc = q._updateForExec();
      let i = 0;
      for (key in doc.$push.n) {
        assert.equal(key, order[i]);
        i++;
      }

      done();
    });
  });
});
