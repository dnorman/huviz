/*
  SortedSet

  SortedSet is a javascript Array which stays sorted and permits only
  once instance of each itm to be added.

  It adds these methods:
    add(itm)
    has(itm) => bool
    acquire(itm) # remove(itm) from prior set then add(itm) to this
    sort_on(f_or_k) # eg
      sort_on('some_property_name')
      sort_on(function(a,b){ return -1,0 or 1})
    remove(itm)
    binary_search(sought[,ret_ins_idx])
    clear() # empty the set

  SortedSet also supports the notion of items belonging to mutually exclusive
  sets, represented as "being in mutually exclusive states".
    isState(state_name) # makes the sortedset act in mutual exclusion with others
  If an item is "in a state" then its .state property contains a link to
  the sortedset "it is currently in".

  If one wants to record membership on items by attaching flags to them
  this can be accomplished with SortedSet.isFlag(flag_name)
    isFlag(flag_name) # items in the set get the property [flag_name]

  dead = new SortedSet().isState('dead')
  alive = new SortedSet().isState('alive')
  sick = new SortedSet().isFlag('sick')
  amputee = new SortedSet().isFlag('amputee')

  alice = {'id':'alice'};
  alive.add(alice);
  amputee.add(alice)
  alice.state == alive; // ==> true
  alice.state == dead;  // ==> false
  dead.acquire(alice);
  !!alice.amputee == true; // ==> true


  author: Shawn Murphy <smurp@smurp.com>
  written: 2013-11-15
  funder:  TM&V -- The Text Mining and Visualization project
  Copyright CC BY-SA 3.0  See: http://creativecommons.org/licenses/by-sa/3.0/

  http://stackoverflow.com/a/17866143/1234699
    provided guidance on how to 'subclass' Array

    "use strict";

 */
var SortedSet = function(){
  if (arguments.callee) {arguments.callee.NUMBER_OF_COPIES += 1;}
  if (window) {
    if (!window.NUM_SORTEDSET){window.NUM_SORTEDSET = 0}
    window.NUM_SORTEDSET += 1;
  }
  var array = [];
  array.push.apply(array,arguments);
  array.case_insensitive = false;
  array.case_insensitive_sort = function(b) {
    if (typeof b == 'boolean') {
      if (b) { // INSENSITIVE
        array.cmp_options.caseFirst = false;
        array.cmp_options.sensisitivity = 'base';
      } else { // SENSITIVE
        array.cmp_options.caseFirst = 'upper';
        array.cmp_options.sensisitivity = 'case';
      }
      array.case_insensitive = b;
      array.resort();
    }
    return array;
  }
  array.cmp_options = {numeric: true, caseFirst: 'upper', sensitivity: 'case'};
  array._f_or_k = 'id';
  array._cmp_instrumented = function(a, b){
    /*
      Return a negative number if a < b
      Return a zero if a == b
      Return a positive number if a > b
    */
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    //console.log(f_or_k, array.case_insensitive);
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    if (!array.case_insensitive && acase != av) {
      throw new Error("" + acase + " <> " + av + " BUT SHOULD EQUAL")
    }
    //var retval = av.localeCompare(bv, 'en', array.cmp_options);
    var retval = (acase < bcase) && -1 || ((acase > bcase) && 1 || 0);
    /*
      if (window.SORTLOG) {
      console.error(`${array.id}.${f_or_k} ${array.case_insensitive&&'IN'||''}SENSITIVE "${av}" ${DIR[retval+1]} "${bv}  (${retval})"`, array.cmp_options);
      }
    */
    array._verify_cmp(av, bv, retval);
    return retval;
  }
  array._cmp = function(a, b) {
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    return (acase < bcase) && -1 || ((acase > bcase) && 1 || 0);
  }
  array._verify_cmp = function(av, bv, retval) {
    var dir = ['less than', 'equal to', 'greater than'][retval+1],
        right_or_wrong = 'wrongly',
        sense = (!array.case_insensitive && 'UN' || '') + 'SQUASHED',
        acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    if (sense == 'UNSQUASHED' &&
        acase != av &&
        av.toLowerCase() != av) {
      /*
        Is case INSENSITIVE comparison happening on the right values?

        Confirm that when a case_insensitive sort is happening
        AND the value upon which comparison actually happens (acase) differs from av
        AND that there are uppercase characters to squash
      */
      throw new Error(""+sense+"("+array.case_insensitive + ") but av(" + av + ") compared as acase(" + acase +")");
    }
    var tests = ['(retval > 0 && acase <= bcase)',
                 '(retval < 0 && acase >= bcase)',
                 '(retval == 0 && acase != bcase)'];
    tests.forEach(function(test){
      if (eval(test)) {
        throw new Error("" +test + " SHOWS _cmp(" + sense + ") " + right_or_wrong +
                        " calling a(" + acase + ") " + dir +" b(" + bcase + ")");
      }
    });
    right_or_wrong = 'rightly';
    //console.error(`_cmp(${sense}) ${right_or_wrong} calling a(${acase}) ${dir} b(${bcase})`);
  }
  array.sort_on = function(f_or_k){ // f_or_k AKA "Function or Key"
    //   f_or_k: a comparison function returning -1,0,1
    var DIR = ['<','=','>'];
    if (typeof f_or_k == 'string'){ // item object key to sort on the value of
      array._f_or_k = f_or_k
    } else if (typeof f_or_k == 'function'){
      array._cmp = f_or_k;
    } else {
      throw new Error("sort_on() expects a function or a property name");
    }
    array.resort()
    return array;
  }
  array.resort = function() {
    //if (window.SORTLOG) { console.groupCollapsed('resort') }
    array.sort(array._cmp);
    //if (window.SORTLOG) { console.groupEnd('resort') }
  }
  array.clear = function(){
    array.length = 0;
    for (var i = array.length - 1; i > -1; i--) {
      array[i].remove()
    }
    return array.length == 0; // should be zero now
  };
  array.isState = function(state_property){
    /*
     * Calling isState() on a SortedSet() prepares it so that
     * when add() is called then the SortedSet is registered on
     * the itm.state property.  This means that if the item
     * is moved to a different SortedSet then it's state can
     * be tested and altered.  This enforces mutually exlusive item
     * membership among the sets which all have isState() asserted.
     */
    array.state_property = state_property || 'state';
    return array;
  };
  array.isFlag = function(flag_property){
    /*
     * Calling isFlag() on a SortedSet() prepares it so that
     * when add() is called then the SortedSet is registered on
     * the itm[flag_property].  When the item is removed from
     * the isFlagged SortedSet then that flag_property is deleted.
     * The default value for the name of the flag_property is
     * simply the name of SortedSet().  The motivation of course
     * is for many flags to be able to be set on each node, unlike
     * states, which are mutually exclusive.
     */
    array.flag_property = flag_property || array.id; // array.state_name
    return array;
  };
  /*
    Maintain a containership heirarchy on the slots 'subsets' and 'superset'
  */
  array.subsets = [];
  array.sub_of = function(superset) {
    array.superset = superset;
    superset.has_sub(array);
    return array;
  };
  array.has_sub = function(subset) {
    array.subsets.push(subset);
    if (subset.superset != array) {
      subset.superset = array;
    }
    return array;
  };
  array.named = function(name){
    array.id = name;
    return array;
  };
  array.labelled = function(label) {
    array.label = label;
    return array;
  };
  array.get_label = function() {
    return array.label || array.id;
  };
  array.sort_on('id');
  array.toggle = function(itm){
    // Objective:
    //   add() or remove() as needed
    if (array.has(itm)) {
      array.remove(itm);
    } else {
      array.add(itm);
    }
  };
  array.alter = function(itm, callback) {
    /*
     * Objective:
     *   Alter supports making a possibly position-altering change to an item.
     *   Naively changing an item could invalidate its sort order breaking
     *   operations which depend on that order.
     * Means:
     *   Alter finds itm then calls the callback, which might change itm
     *   in a way which ought to cause a repositioning in the array.
     *   If the sorted position of itm is now invalid then figure out where
     *   it should be positioned and move it there, taking care to not be
     *   distracted during binary_search by the fact that item is already
     *   in the set but possibly misorderedly so.
     */
    var current_idx = array.binary_search(itm, true);
    callback();
    if (array.validate_sort_at(current_idx, true)) {
      return current_idx;
    }
    // It was NOT in the right position, so remove it and try again
    //array.remove(itm); // remove does not work because itm is mis-sorted
    return array.nudge_itm_at_(itm, current_idx);
  }
  array.nudge_itm_at_ = function(itm, current_idx) {
    var removed = array.splice(current_idx, 1);
    if (removed.length != 1 || removed[0] != itm) {
      var msg = "failed to remove " + itm[array._f_or_k] + " during .add()";
      console.debug(msg);
      //throw new Error(msg);
    }
    var ideal = array.binary_search(itm, true);
    var before_removal_count = array.length;
    array.remove(itm);
    var after_removal_count = array.length;
    if (false && !(before_removal_count - after_removal_count == 1)) {
      var msg = "temporarily removing itm extracted " +
          (before_removal_count - after_removal_count) +
          " items";
      console.debug(msg);
      // throw new Error(msg);
    }
    //array.splice(ideal.idx, 0, itm);
    array._engage_at(itm, ideal.idx);
    return array;
  }
  array.add = function(itm){
    /*
     * Objective:
     *   Maintain a sorted array which acts like a set.
     *   It is sorted so insertions and tests can be fast.
     * Return:
     *   The index at which it was inserted (or already found)
     */
    var c = array.binary_search(itm, true)
    if (typeof c == 'number'){ // an integer was returned, ie it was found
      return c;
    }
    array._engage_at(itm, c.idx);
    //array.is_sorted();
    return c.idx;
  }
  array._engage_at = function(itm, idx) {
    array.splice(idx,0,itm);
    if (array.state_property){
      itm[array.state_property] = array;
    }
    if (array.flag_property){
      itm[array.flag_property] = array;
    }
  }
  array.has = function(itm){ // AKA contains() or is_state_of()
    if (array.state_property){
      return itm[array.state_property] == array;
    }
    if (array.flag_property){
      return itm[array.flag_property] == array;
    }
    alert("we should never get here");
  };
  array.remove = function(itm){
    /*
     * Objective:
     *   Remove item from an array acting like a set.
     *   It is sorted by cmp, so we can use binary_search for removal
     */
    var duds = [];
    var c = array.binary_search(itm);
    //console.log("c:", c, array.is_sorted());
    if (c > -1){  // it was found
      duds = array.splice(c, 1);  // remove itm into the duds array (expecting length == 1)
      if (true) { // report because
        var because = ((duds.length != 1) && (""+ duds.length + " removed, not 1")) ||
            ((duds[0] != itm) && (duds[0].lid + " was removed instead of " + itm.lid)) || "";
        if (because) {
          console.log(itm[array._f_or_k], '??', duds[0][array._f_or_k])
          var msg = "remove failed at idx " + c + " to splice " + itm.id +
              " out of "+ array.label + " because "+ because;
          console.debug(msg);
          //throw new Error(msg);
        }
      }
    } else {
      //debugger;
      //throw new Error(`remove() is failing at idx ${c} because array.binary_search() failed to find ${itm.lid} in ${array.label}`);
    }
    if (array.state_property){
      itm[array.state_property] = true; // EXAMINE delete instead?
    }
    if (array.flag_property){
      delete itm[array.flag_property];
    }
    return duds[0];
  }
  array.acquire = function(itm){
    // acquire() is like add() for SortedSet() but it takes care
    // of removing itm from the previous SortedSet
    var last_state = itm[array.state_property];
    if (last_state && last_state.remove){
      last_state.remove(itm);
    }
    return array.add(itm);
  };
  array.get = function(sought){
    var idx = array.binary_search(sought);
    if (idx > -1){
      return array[idx];
    }
  };
  array.get_by = function(key,val){
    var o = {};
    o[key] = val;
    return this.get(o);
  };
  array.binary_search = function(sought, ret_ins_idx, callback){
    /*
     * This method performs a binary-search-powered version of indexOf(),
     * that is; it returns the index of sought or returns -1 to report that
     * it was not found.
     *
     * If ret_ins_idx (ie "RETurn the INSertion INdeX") is true then
     * instead of returning -1 upon failure, it returns the index at which
     * sought should be inserted to keep the array sorted.
     */
    ret_ins_idx = ret_ins_idx || false;
    var step = 0;
    var seeking = true;
    if (array.length < 1) {
      if (ret_ins_idx) {
	return {idx:0};
      }
      return -1;
    }
    var mid, mid_node, prior_node, c,
	bot = 0,
        top = array.length;
    while (seeking){
      mid = bot + Math.floor((top - bot)/2);
      mid_node = array[mid];
      c = array._cmp(mid_node, sought);
      if (callback) {
        callback(array, sought, mid_node, prior_node, {mid: mid, bot: bot, top: top, c: c, step: step})
      }
      step++;
      prior_node = mid_node;
      //console.log(" c =",c);
      if (c == 0) {
        if (callback) {callback(array, null, null, null, {done: true, retval: mid});}
        return mid;
      }
      if (c < 0){ // ie this[mid] < sought
	bot = mid + 1;
      } else {
	top = mid;
      }
      if (bot == top){
	if (ret_ins_idx){
          if (callback) {callback(array, null, null, null, {done: true, retval: bot});}
          return {idx:bot};
	}
        if (callback) {callback(array, null, null, null, {done: true, retval: -1});}
        return -1;
      };
    }
  }
  array.is_sorted = function() { // return true or throw
    for (var i = 0; (i + 1) < array.length; i++) {
      if (array.length > 1) {
        array.validate_sort_at(i);
      }
    }
    return true;
  }
  array.validate_sort_at = function(i, or_return) {
    var
    key = array._f_or_k,
    after = array[i+1],
    tween = array[i],
    before = array[i-1],
    or_return = !or_return;  // defaults to true
    // ensure monotonic increase
    if (typeof after != 'undefined' && array._cmp(tween, after) > 0) {
      if (or_return) {
        throw new Error('"' + tween[key] + '" is before "' + after[key] + '"');
      } else {
        return false;
      }
    }
    if (typeof before != 'undefined' && array._cmp(before, tween) > 0) {
      if (or_return) {
        throw new Error('"' + before[key] + '" is before "' + tween[key] + '"');
      } else {
        return false;
      }
    }
    return true;
  }
  array.dump = function() {
    for (var i = 0; i < array.length; i++) {
      var node = array[i];
      console.log(node.lid, node.name.toString(), node.name);
    }
  }
  array.roll_call = function() {
    var out = [];
    for (var i = 0; i < array.length; i++) {
      out.push(array[i].lid || array[i].id);
    }
    return out.join(', ');
  }
  return array;
};
// Instrument SortedSet so we can track the number of 'instances'.
// This is motivated by the fact that it is currently implemented
// not as a regular subclass of Array (which was not possible when it was created)
// but as a set of adornments on an Array instances, thereby incurring
// the burden of each such copy carrying its own copies of the SortedSet
// methods with it.  See https://github.com/cwrc/HuViz/issues/259
SortedSet.NUMBER_OF_COPIES = 0;

// These tests are included in the module to simplify testing in the browser.
var SortedSets_tests = function(verbose){
  verbose = verbose || false;
  var n = function(a,b){
    if (a == b) return 0;
    if (a < b) return -1;
    return 1;
  }
  var
  a = {id:1},
  b = {id:2},
  c = {id:0},
  d = {id:3},
  stuff = SortedSet(a,b),
  a_d = SortedSet(a,d).sort_on('id'),
  ints = SortedSet(0,1,2,3,4,5,6,7,8,10).sort_on(n),
  even = SortedSet(0,2,4,6,8,10).sort_on(n),
  some_dupes = SortedSet(0,1,2,2,5,7,2,9).sort_on(n);

  function expect(stmt,want){
    var got = eval(stmt);
    if (verbose) console.log(stmt,"==>",got);
    if (got != want){
      throw stmt + " returned "+got+" expected "+want;
    }
  }
  function assert(be_good, or_throw){
    if (! be_good) throw or_throw;
  }
  function cmp_on_name(a,b){
    if (a.name == b.name) return 0;
    if (a.name < b.name)  return -1;
    return 1;
  }
  function cmp_on_id(a,b){
    if (a.id == b.id) return 0;
    if (a.id < b.id) return -1;
    return 1;
  }

  expect("cmp_on_id(a,a)",0);
  expect("cmp_on_id(a,b)",-1);
  expect("cmp_on_id(b,a)",1);
  expect("ints.binary_search(0)",0);
  expect("ints.binary_search(4)",4);
  expect("ints.binary_search(8)",8);
  expect("ints.binary_search(9)",-1);
  expect("ints.binary_search(9,true).idx",9);
  expect("ints.binary_search(-3)",-1);
  expect("even.binary_search(1,true).idx",1);
  expect("even.binary_search(3,true).idx",2);
  expect("even.binary_search(5,true).idx",3);
  expect("even.binary_search(7,true).idx",4);
  expect("even.binary_search(9,true).idx",5);
  expect("even.binary_search(9)",-1);
  expect("even.binary_search(11,true).idx",6);
  expect("stuff.binary_search(a)",0);
  expect("stuff.binary_search(b)",1);
  expect("stuff.binary_search(c)",-1);
  expect("stuff.binary_search(d)",-1);
  expect("a_d.binary_search(c)",-1);
  expect("a_d.binary_search(c,true).idx",0);
  expect("a_d.binary_search(b,true).idx",1);
  expect("a_d.add(b)",1);
  expect("a_d.binary_search(a)",0);
  expect("a_d.binary_search(b)",1);
  expect("a_d.binary_search(d)",2);
  expect("a_d.add(c)",0);
};
//Sortedsets_tests();
if (typeof module !== 'undefined' && module.exports) {
  module.exports.SortedSet = SortedSet;
}

function hsv2rgb(hue, sat, val) {
    // See
    //    http://en.wikipedia.org/wiki/HSL_and_HSV
    // from: 
    //    http://www.actionscript.org/forums/archive/index.php3/t-15155.html
    // see also:
    //    http://www.webreference.com/programming/javascript/mk/column3/creating/cp_mini_gradient_details.png
    var red, grn, blu, i, f, p, q, t;
    hue%=360; // probably not needed
    if(val==0) {return("rgb(0,0,0)");}
    sat/=100;
    val/=100;
    hue/=60;
    i = Math.floor(hue);
    f = hue-i;
    p = val*(1-sat);
    q = val*(1-(sat*f));
    t = val*(1-(sat*(1-f)));
    if (i==0) {red=val; grn=t; blu=p;}
    else if (i==1) {red=q; grn=val; blu=p;}
    else if (i==2) {red=p; grn=val; blu=t;}
    else if (i==3) {red=p; grn=q; blu=val;}
    else if (i==4) {red=t; grn=p; blu=val;}
    else if (i==5) {red=val; grn=p; blu=q;}
    red = Math.floor(red*255);
    grn = Math.floor(grn*255);
    blu = Math.floor(blu*255);
    var r_g_b = [red,grn,blu];
    //document.spangle_controls.status.value = r_g_b.valueOf();
    return "rgb(" + r_g_b.valueOf() + ")";
}

/*   http://jsfiddle.net/EPWF6/9/  
 *   https://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB 
 *     Unfortunately this is seriously buggy!
 *       
 */
function hsl2rgb(H, S, L) {
    var input_s = "hsl2rgb(" + [H, S, L].toString() + ")";
    /*
     * H ∈ [0°, 360°)
     * S ∈ [0, 1]
     * L ∈ [0, 1]
     */
    if (H == 360) { H = 359.9999; };
    H %= 360;
    /* calculate chroma */
    var C = (1 - Math.abs((2 * L) - 1)) * S;

    /* Find a point (R1, G1, B1) along the bottom three faces of the RGB cube, with the same hue and chroma as our color (using the intermediate value X for the second largest component of this color) */
    var H_ = H / 60;

    var X = C * (1 - Math.abs((H_ % 2) - 1));

    var R1, G1, B1;

    if (H === undefined || isNaN(H) || H === null) {
        R1 = G1 = B1 = 0;
    }
    else {

        if (H_ >= 0 && H_ < 1) {
            R1 = C;
            G1 = X;
            B1 = 0;
        }
        else if (H_ >= 1 && H_ < 2) {
            R1 = X;
            G1 = C;
            B1 = 0;
        } else if (H_ >= 2 && H_ < 3) {
            R1 = 0;
            G1 = C;
            B1 = X;
        } else if (H_ >= 3 && H_ < 4) {
            R1 = 0;
            G1 = X;
            B1 = C;
        } else if (H_ >= 4 && H_ < 5) {
            R1 = X;
            G1 = 0;
            B1 = C;
        }
        else if (H_ >= 5 && H_ < 6) {
            R1 = C;
            G1 = 0;
            B1 = X;
        }
    }

    /* Find R, G, and B by adding the same amount to each component, to match lightness */

    var m = L - (C / 2);

    var R, G, B;

    /* Normalise to range [0,255] by multiplying 255 */
    R = (R1 + m) * 255;
    G = (G1 + m) * 255;
    B = (B1 + m) * 255;

    R = Math.round(R);
    G = Math.round(G);
    B = Math.round(B);

    retval = "rgb(" + R + ", " + G + ", " + B + ")";
    //    console.info(input_s,retval);
    return retval;
}

(function() {
  d3.fisheye = {
    scale: function(scaleType) {
      return d3_fisheye_scale(scaleType(), 3, 0);
    },
    circular: function() {
      var radius = 200,
          distortion = 2,
          k0,
          k1,
          focus = [0, 0];

      function fisheye(d) {
        var dx = d.x - focus[0],
            dy = d.y - focus[1],
            dd = Math.sqrt(dx * dx + dy * dy);
        if (!dd || dd >= radius) return {x: d.x, y: d.y, z: 1};
        var k = k0 * (1 - Math.exp(-dd * k1)) / dd * .75 + .25;
        return {x: focus[0] + dx * k, y: focus[1] + dy * k, z: Math.min(k, 10)};
      }

      function rescale() {
        k0 = Math.exp(distortion);
        k0 = k0 / (k0 - 1) * radius;
        k1 = distortion / radius;
        return fisheye;
      }

      fisheye.radius = function(_) {
        if (!arguments.length) return radius;
        radius = +_;
        return rescale();
      };

      fisheye.distortion = function(_) {
        if (!arguments.length) return distortion;
        distortion = +_;
        return rescale();
      };

      fisheye.focus = function(_) {
        if (!arguments.length) return focus;
        focus = _;
        return fisheye;
      };

      return rescale();
    }
  };

  function d3_fisheye_scale(scale, d, a) {

    function fisheye(_) {
      var x = scale(_),
          left = x < a,
          range = d3.extent(scale.range()),
          min = range[0],
          max = range[1],
          m = left ? a - min : max - a;
      if (m == 0) m = max - min;
      return (left ? -1 : 1) * m * (d + 1) / (d + (m / Math.abs(x - a))) + a;
    }

    fisheye.distortion = function(_) {
      if (!arguments.length) return d;
      d = +_;
      return fisheye;
    };

    fisheye.focus = function(_) {
      if (!arguments.length) return a;
      a = +_;
      return fisheye;
    };

    fisheye.copy = function() {
      return d3_fisheye_scale(scale.copy(), d, a);
    };

    fisheye.nice = scale.nice;
    fisheye.ticks = scale.ticks;
    fisheye.tickFormat = scale.tickFormat;
    return d3.rebind(fisheye, scale, "domain", "range");
  }
})();

// based on https://github.com/talis/rdfquads.js
function Quad(subject,pred,obj,graph) {
    this.s = new RdfUri(subject);
    this.p = new RdfUri(pred);
    this.o = new RdfObject(obj);
    this.g = new RdfUri(graph);
}
Quad.prototype.toString = function() {
    return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
}
Quad.prototype.toNQuadString = function() {
    return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
}


var uriRegex = /<([^>]*)>/ ;

function RdfUri(url) {
    self = this;
    var match = url.match(uriRegex);
    if (match) {
        self.raw = match[1];
    } else {
        self.raw = url;
    }
}
RdfUri.prototype.toString = function() {
    return this.raw;
}

function RdfObject(val) {    
    self = this;
    var match = val.match(uriRegex);
    if (match) {
        self.raw = match[1];
        self.type = 'uri';
    } else {
        self.raw = val;
        self.type = 'literal';
    }
}
RdfObject.prototype.toString = function() {
    return this.raw;
}
RdfObject.prototype.isUri = function() {
    return this.type == 'uri';
}
RdfObject.prototype.isLiteral = function() {
    return this.type == 'literal';
}

var quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*\#*.*$/ ;
var isComment = /^\s*\/\// ;

function parseQuadLine(line) {
    if (line == null || line === "" || line.match(isComment)) {
        return null;
    } else {
	//console.log ("parseQuadLine(",line,")");
        var match = line.match(quadRegex);
	//console.log("match",match,line);
        if (match){
            var s = match[1].trim();
            var p = match[2].trim();
            var o = match[3].trim();
            var g = match[4].trim();
            return new Quad(s,p,o,g);
	//} else {
	//    console.log("no match: "+line);
	}
    }
}

"use strict";

/*
MultiString
  purpose:
     Provide an object that can be used in place of a string, in that
     it returns a string value, but actually stores multiple per-language
     versions of the string and can be reconfigured as to which different
     language version gets returned.
  see:
     https://stackoverflow.com/a/28188150/1234699
  features:
    Expects langpath values which are colon-delimted lists of 2-letter
    language codes.  The final value in the list can instead be the
    word ANY, a wildcard meaning that every language not yet represented
    in the language path would be respected too.

    Note that MultiStrings can also have 'NOLANG' values, that is, values
    with no associated language.  These are always on the priority list,
    but at the end, even after ANY is respected.

    If one wants to make referencde to the "NOLANG" value, one can
    do so explicitly with the term NOLANG in the langpath.

  examples:
    "en"
      means that if an English value has been provided it will be
      respected and that if there is a NOLANG value it will be shown
      otherwise.  On no account will values in other languages be shown.

    "en:fr"
      If a MultiString instance has an English value it will be shown,
      otherwise if a French value is available it will be shown, failing
      that if a NOLANG value is present, it will be shown.

    "en:ANY"
      If a MultiString instance has an English value it will be shown,
      otherwise if value tagged with any other lanugage is available
      it will be shown (in no particular order) and finally if a
      "NOLANG" value is present, it will be shown.

    "en:NOLANG:ANY"
      Show English if available, or the NOLANG value or a value from
      ANY other language if present -- in that priority order.
*/

function MultiString() {
  var i;
  if (arguments.length == 0) {
    this.set_val_lang()
  } else {
    i = -1;
    while (typeof(arguments[i+=1]) != 'undefined') { // an empty string is a legal name
      // process value/lang pairs
      this.set_val_lang(arguments[i] || '', arguments[i+=1]);
    }
  }
  Object.defineProperty(
    this, 'length',
    {get: function () { return (this.valueOf()||'').length; }});
};

// inherit all properties from native class String
MultiString.prototype = Object.create(String.prototype);

MultiString.prototype.set_val_lang = function(value, lang) {
  //  set a value/lang pair where undefined lang sets NOLANG value
  if (lang) {
    this[lang] = value;
  } else {
    this.NOLANG = value || '';
  }
};

MultiString.langs_in_path = []; // default value
MultiString.prototype.set_lang_val = function(lang, value) {
  this.set_val_lang(value, lang);
};

MultiString.prototype.get_ANY_but_langs_in_path = function() {
  var langs_in_path = MultiString.langs_in_path;
  for (var key in this) {
    if (this.hasOwnProperty(key)) {
      if (langs_in_path.indexOf(key) == -1) {
        return this[key];
      }
    }
  };
};

MultiString.prototype.get_ALL = function() {
  var retval = '';
  for (var key in this) {
    if (key.length == 2) {
      if (retval) {
        retval += ', '
      }
      retval += '"' + this[key] + '"@' + key;
    } else if (key == 'NOLANG') {
      if (retval) {
        retval += ', '
      }
      retval += '"' + this[key] + '"';
    }
  };
  return retval;
};

const LANGCODE_RE = /^[a-z]{2}$/

MultiString.set_langpath = function(langpath){
  var langs = [],
      parts = [],
      langs_in_path = [],
      nolang_used = false;
  if (langpath) {
    parts = langpath.split(':');
    parts.forEach(function(p,idx){
      if (p.match(LANGCODE_RE)) {
        langs.push(p);
        langs_in_path.push(p);
      } else if (p == 'NOLANG') {
        nolang_used = true;
        langs.push(p);
      } else if (p == 'ANY') {
        langs.push("get_ANY_but_langs_in_path()")
      } else if (p == 'ALL') {
        langs.push("get_ALL()")
      } else {
        throw new Error("<" + p + "> is not a legal term in LANGPATH");
      }
    });
  }
  MultiString.langs_in_path = langs_in_path;
  var body = "return";
  if (langs.length) {
    body += " this."+langs.join(' || this.');
    body += " || ";
  }
  body += "''";
  // Compile a new function which follows the langpath for the value
  // so String.prototype methods can get to the value
  MultiString.prototype.toString =
    MultiString.prototype.valueOf =
    new Function(body);
};

MultiString.set_langpath('ANY:NOLANG'); // set the default langpath

// Extend class with a trivial method
MultiString.prototype.behead = function(){
  return this.substr(1);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.MultiString = MultiString;
}

"use strict";

function OnceRunner(verbosity, name) {
  this.verbosity = verbosity || 0;
  this.profileName = (name || 'OnceRunner') + '_' + (new Date()).toISOString();
  this.active = false;
};

OnceRunner.prototype.setTimeout = function(cb, msec) {
  //console.log(`afterMsec_call(${msec}) typeof cb ==>`,typeof cb);
  if (! this.firstCallTime) { // when a new string of calls begins
    this.firstCallTime = Date.now();
    this.active = true;
    this.stats = {};
    if (this.verbosity > 39) {
      console.profile(this.profileName);
    }
    this.clearCount = 0; // the number of times execution has been delayed
  }
  if (this.timeoutID) {
    if (this.verbosity > 29) {
      console.warn("clearTimeout()", this.timeoutID._idleStart || this.timeoutID);
    }
    clearTimeout(this.timeoutID);
    this.clearCount++;
  }
  //cb = function() {console.log("mockFunc() called")};
  return this.timeoutID = setTimeout(this.makeWrapper(cb), msec);
};

OnceRunner.prototype.makeWrapper = function(callback) {
  var self = this;
  return function() {
    var stats = "";
    if (self.verbosity > 19) {
      console.warn("calling callback ",self.timeoutID._idleStart || self.timeoutID);
    }
    var callbackExecutionStart = Date.now();
    callback();
    self.active = false;
    var callbackExecutionEnd = Date.now();
    var callbackExecutionDurationMsec = callbackExecutionEnd - callbackExecutionStart;
    var overallExecutionDurationMsec = callbackExecutionEnd - self.firstCallTime;
    var timeSavedMsec = callbackExecutionDurationMsec * self.clearCount;
    var wouldaBeenDurationMsec = overallExecutionDurationMsec + timeSavedMsec;
    var timeSavedRatio = timeSavedMsec / wouldaBeenDurationMsec;
    self.stats.timeSavedRatio = timeSavedRatio;
    self.stats.timeSavedSec = timeSavedMsec/1000;
    self.stats.wouldaBeenSec = wouldaBeenDurationMsec / 1000;
    self.stats.profileName = self.profileName;
    if (self.verbosity > 9) {
      console.warn("OnceRunner() stats", self.stats);
    }
    if (self.verbosity > 39) {
      console.profileEnd();
    }
    self.firstCallTime = null; // an execution has happened so reset
  };
};

(typeof exports !== "undefined" && exports !== null ? exports : this).OnceRunner = OnceRunner;

(function() {
  /*
    Select every Thing except Penguin .
    Activate Person .
    Wander and Label NationalHeritage .
    Select GeographicHeritage .
    Draw Selected regarding relocatesTo .
    Walk Ethnicity .
   */

  var InputStream = function(input) {
    // copied from http://lisperator.net/pltut/parser/input-stream
    // usage:
    //     var stream = InputStream(string)
    var pos = 0, line = 1, col = 0;
    return {
      next  : next,
      peek  : peek,
      eof   : eof,
      croak : croak,
    };
    function next() {
      var ch = input.charAt(pos++);
      if (ch == "\n") line++, col = 0; else col++;
      return ch;
    }
    function peek() {
      return input.charAt(pos);
    }
    function eof() {
      return peek() == "";
    }
    function croak(msg) {
      throw new Error(msg + " (" + line + ":" + col + ")");
    }
  };

  var TokenStream = function(input) {
    // based on http://lisperator.net/pltut/parser/token-stream
    var current = null;
    //window.current = null
    var reserved = "with let ";
    // TODO Probably want to pass the builtins in as an argument
    var verbs = " " +
        "Choose Unchoose " +
        "Activate Deactivate " +
        "Select Unselect " +
        "Label Unlabel " +
        "Shelve Hide " +
        "Discard Retrieve " +
        "Pin Unpin " +
        "Wander Walk " +
        "Draw ";
    var connectors = " every except regarding and ";
    var sets = " Activated Chosen Graphed Hidden Labelled Nameless Pinned Selected Shelved ";
    var keywords = verbs + connectors + sets;
    //var keywords = " true false t f "; // + reserved + builtins;
    return {
      next  : next,
      peek  : peek,
      eof   : eof,
      croak : input.croak
    };

    function is_keyword(x) {
      return keywords.indexOf(" " + x + " ") >= 0;
    }
    function is_set(x) {
      return sets.indexOf(" " + x + " ") >= 0 && 'set';
    }
    function is_verb(x) {
      return verbs.indexOf(" " + x + " ") >= 0 && 'verb';
    }
    function is_connector(x) {
      return connectors.indexOf(" " + x + " ") >= 0 && 'connector';
    }
    /*
    function is_noun(x) {
      return is_set(x) || is_
    }
    */
    function is_digit(ch) {
      return /[0-9]/i.test(ch);
    }
    function is_id_start(ch) {
      return /[a-zA-Z]/i.test(ch);
    }
    function is_id(ch) {
      // Verbs, Sets, connectors and CURIEs may contain _
      return is_id_start(ch) || "_".indexOf(ch) >= 0;
    }
    function is_punc(ch) {
      // What about ; ?  Isn't ; what is being used to delimit commands in the URL?
      return ",.;".indexOf(ch) >= 0;
    }
    function is_whitespace(ch) {
      // How is the + sign in the URL version being handled? Gasp, outside of this parser?!!!?
      return " \t\n".indexOf(ch) >= 0;
    }
    function read_while(predicate) {
      var str = "";
      while (!input.eof() && predicate(input.peek()))
	str += input.next();
      return str;
    }
    function read_number() {
      /*
        At this point the GVCL does not seem to need numbers!
      */
      var has_dot = false;
      var number = read_while(function(ch){
	if (ch == ".") {
	  if (has_dot) return false;
	  has_dot = true;
	  return true;
	}
	return is_digit(ch);
      });
      // TODO test for negative number support
      return { type: "num", value: parseFloat(number) };
    }
    function read_ident() {
      var id = read_while(is_id);
      console.log('id:',id)
      return {
	// FormURLa needs builtins (above, beside, graph, table)
	// and (maybe!) keyword parameters, but not "var"
	// unless and until something like "with" or "let" are
	// implemented.
	type  : is_verb(id) || is_connector(id) || is_set(id) || "var",
	value : id
      };
    }
    function read_escaped(end) {
      var escaped = false, str = "";
      input.next();
      while (!input.eof()) {
	var ch = input.next();
	if (escaped) {
	  str += ch;
	  escaped = false;
	} else if (ch == "\\") {
	  escaped = true;
	} else if (ch == end) {
	  break;
	} else {
	  str += ch;
	}
      }
      return str;
    }
    function read_string() {
      return { type: "str", value: read_escaped('"') };
    }
    function skip_comment() {
      // Use Guillemet or "Latin quotation marks" for comments.
      //    https://en.wikipedia.org/wiki/Guillemet
      //        «comments␠go␠here»
      //
      // Consider the use of ␠ ie U+2420 "SYMBOL FOR SPACE" as
      // a space character in comments because it reads fairly well
      // as a space and does not get translated into %20 as all the
      // invisible Unicode space characters seem to:
      //    https://www.cs.tut.fi/~jkorpela/chars/spaces.html
      // Here is an example of a FormURLa with such a comment:
      //   print("hello, world"«this␠comment␠has␠some␠(weird!)␠spaces␠in␠it»)
      read_while(function(ch){ return ch != "»" });
      input.next();
    }
    function read_next() {
      read_while(is_whitespace);
      if (input.eof()) return null;
      var ch = input.peek();
      if (ch == "«") {  // left pointing double angle quotation mark
	skip_comment();
	return read_next();
      }
      if (ch == '"') return read_string();
      if (is_id_start(ch)) return read_ident();
      if (is_punc(ch)) return {
	type  : "punc",
	value : input.next()
      };
      input.croak("Can't handle character: «"+ch+"»");
    }
    function peek() {
      return current || (current = read_next());
    }
    function next() {
      var tok = current;
      current = null;
      return tok || read_next();
    }
    function eof() {
      return peek() == null;
    }
  };

  var FALSE = { type: "bool", value: false };
  function parse(input) {
    // based on http://lisperator.net/pltut/parser/the-parser
    var PRECEDENCE = {
      // NONE OF THIS IS IN USE in GVCL
      "=": 1,
      "||": 2,
      "&&": 3,
      "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
      "+": 10, "-": 10,
      "*": 20, "/": 20, "%": 20,
    };
    return parse_toplevel();
    function is_punc(ch) {
      var tok = input.peek();
      return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
    }
    function is_kw(kw) {
      var tok = input.peek();
      return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
    }
    function is_op(op) {
      var tok = input.peek();
      return tok && tok.type == "op" && (!op || tok.value == op) && tok;
    }
    function skip_punc(ch) {
      if (is_punc(ch)) input.next();
      else input.croak("Expecting punctuation: \"" + ch + "\"");
    }
    function skip_kw(kw) {
      if (is_kw(kw)) input.next();
      else input.croak("Expecting keyword: \"" + kw + "\"");
    }
    function skip_op(op) {
      if (is_op(op)) input.next();
      else input.croak("Expecting operator: \"" + op + "\"");
    }
    function unexpected() {
      input.croak("Unexpected token: " + JSON.stringify(input.peek()));
    }
    function maybe_binary(left, my_prec) {
      var tok = is_op();
      if (tok) {
	var his_prec = PRECEDENCE[tok.value];
	if (his_prec > my_prec) {
	  input.next();
	  return maybe_binary({
	    type     : tok.value == "=" ? "assign" : "binary",
	    operator : tok.value,
	    left     : left,
	    right    : maybe_binary(parse_atom(), his_prec)
	  }, my_prec);
	}
      }
      return left;
    }
    function delimited(start, stop, separator, parser) {
      var a = [], first = true;
      while (!input.eof()) {
	if (is_punc(stop)) break;
	if (first) first = false; else skip_punc(separator);
	if (is_punc(stop)) break;
	a.push(parser());
      }
      return a;
    }
    function is_part_of_speech_or_and(x, pos) {
      console.log('x:', x)
      return (x.type == pos || x.value == 'and' || false);
    }
    function parse_anglicised(member_parser, pos) {
      /*
        Consume 'anglicised' lists like:
          * "one"
          * "one and two"
          * "one, two and three"
       */
      var a = [], first = true;
      var next_input = input.peek();
      while (!input.eof() && (is_part_of_speech_or_and(next_input, pos))) {
	if (is_punc(input.peek())) skip_punc(',');
	if (first) first = false; else skip_punc(',');
	a.push(member_parser());
        next_input = input.peek();
      }
      return a;
    }
    function parse_verb_phrase() {
      return {
        type: 'verb_phrase',
        args: parse_anglicised(parse_verb, 'verb')
      }
    }
    function parse_noun_phrase() {
      return {
        type: 'noun_phrase',
        args: parse_anglicised(parse_noun, 'noun')
      }
    }
    function parse_call(func) {
      return {
	type: "call",
	func: func,
	args: delimited("(", ")", ",", parse_expression),
      };
    }
    function parse_verb() {
      var name = input.next();
      console.log('parse_verb:', name)
      if (name.type != "verb") input.croak("Expecting verb name");
      return name.value;
    }
    function parse_noun() {
      var name = input.next();
      console.log('parse_noun:', name)
      if (name.type != "noun") input.croak("Expecting noun name, got " + JSON.stringify(name));
      return name.value;
    }
    function parse_varname() {
      var name = input.next();
      if (name.type != "var") input.croak("Expecting variable name");
      return name.value;
    }
    function maybe_command(expr) {
      expr = expr();
      return parse_call(expr);
    }
    function parse_atom() {
      return maybe_command(function(){
	if (is_punc("(")) {
	  input.next();
	  var exp = parse_expression();
	  skip_punc(")");
	  return exp;
	}
	/*
	  if (is_punc("{")) return parse_prog();
	  input.next();
	  }
	*/
	var tok = input.next();
	if (tok.type == "var" || tok.type == "num" || tok.type == "str") {
	  return tok;
        }
	unexpected();
      });
    }
    function parse_toplevel() {
      var prog = [];
      while (!input.eof()) {
	prog.push(parse_command());
	// console.log("latest:",prog[prog.length-1]);
      }
      return { type: "prog", prog: prog };
    }
    function parse_prog() {
      var prog = delimited("{", "}", ";", parse_expression);
      if (prog.length == 0) return FALSE;
      if (prog.length == 1) return prog[0];
      return { type: "prog", prog: prog };
    }
    function parse_command() {
      var cmd = {};
      cmd.verb_phrase = parse_verb_phrase();
      cmd.noun_phrase = parse_noun_phrase();
      console.log(JSON.stringify(cmd));
      skip_punc(".");
      return cmd;
    }
  }

  var GVCL = (function() {
    function GVCL(aScript) {
      this.aScript = aScript;
      this.ast = parse(TokenStream(InputStream(aScript)))
    }
    return GVCL;

  })();

  var EXPORTS_OR_THIS = (
    typeof exports !== "undefined" && exports !== null ? exports : this);
  EXPORTS_OR_THIS.GVCL = GVCL;
}).call(this);

(function() {
  //  angliciser(['a','b','c']) ==> "a, b and c"
  //  angliciser(['a','b']) ==> "a and b"
  //  angliciser(['a']) ==> "a"#
  //  angliciser([]) ==> ""
  var angliciser;

  angliciser = function(lst, and_or_or) {
    var b, english, lstlen;
    b = and_or_or;
    and_or_or = (and_or_or == null) && " and " || and_or_or; // uh really?! so one can pass in " or "
    if ((b != null) && and_or_or !== b) {
      throw "and_or_or failing " + b;
    }
    english = "";
    //console.log lst
    lstlen = lst.length;
    lst.forEach((itm, i) => {
      //console.log english
      if (lstlen > 1) {
        if ((lstlen - 1) === i) {
          english += and_or_or;
        } else {
          if (i > 0) {
            english += ', ';
          }
        }
      }
      return english += itm;
    });
    //console.log "'"+english+"'"
    return english;
  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).angliciser = angliciser;

}).call(this);

(function() {

  /*
   *     ColoredTreePicker is a widget for displaying and manipulating a hierarchy
   *     and displaying and manipulating the selectedness of branches and nodes.
   *
   *     The terminology below is a bit screwy because the motivating hierarchy
   *     was a taxonomy controller which determined which nodes in a graph
   *     are 'shown' as selected.  Perhaps better terminology would be to have
   *     'shown' called 'marked' and 'unshown' called 'unmarked'.
   *
   *     ▼ 0x25bc
   *     ▶ 0x25b6
   *
   *     Expanded                   Collapsed
   *     +-----------------+        +-----------------+
   *     | parent        ▼ |        | parent        ▶ |
   *     |   +------------+|        +-----------------+
   *     |   | child 1    ||
   *     |   +------------+|
   *     |   | child 2    ||
   *     |   +------------+|
   *     +-----------------+
   *
   *     Clicking an expanded parent should cycle thru selection and deselection
   *     of only its direct instances, if there are any.
   *
   *     Clicking a collapsed parent should cycle thru selection and deselection
   *     of its direct instances as well as those of all its children.
   *
   *     The coloring of expanded parents cycles thru the three states:
   *       Mixed - some of the direct instances are selected
   *       On - all of the direct instances are selected
   *       Off - none of the direct instances are selected
   *
   *     The coloring of a collapsed parent cycles thru the three states:
   *       Mixed - some descendant instances are selected (direct or indirect)
   *       On - all descendant instances are selected (direct or indirect)
   *       Off - no descendant instances are selected (direct or indirect)
   *
   *     Indirect instances are the instances of subclasses.
   *
   * The states:
   *   showing    everything is "shown" (ie marked)
   *   mixed      some things are shown (ie a mixure of marked and unmarked)
   *   unshowing  though there are things, none are shown (ie unmarked)
   *   empty      a mid-level branch which itself has no direct instances
   *              (motivated by the taxon_picker which often has levels
   *               in its hierarchy which themselves have no direct instances)
   *   hidden     a leaf or whole branch which (at the moment) has no instances
   *              (motivated by the predicate_picker which needs to hide
   *               whole branches which currently contain nothing)
   *
   * Non-leaf levels in a treepicker can have indirect states different
   * from their direct states.  The direct state relates to the direct instances.
   * The indirect state spans the direct state of a level and all its children.
   * Leaf levels should always have equal direct and indirect states.
   *
   */
  var ColoredTreePicker, L_emphasizing, L_showing, L_unshowing, S_all, TreePicker, verbose,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  TreePicker = require('treepicker').TreePicker;

  L_unshowing = 0.93;

  L_showing = 0.75;

  L_emphasizing = 0.5;

  S_all = 0.5;

  verbose = false;

  ColoredTreePicker = (function() {
    class ColoredTreePicker extends TreePicker {
      constructor() {
        super(...arguments);
        // FIXME @recolor_now() unless handled externally
        this.recolor_now = this.recolor_now.bind(this);
        //else
        //  msg = "get_color_forId_byName(" + id + ") failed because @id_to_colors[id] not found"
        //  return 'pink'
        this.click_handler = this.click_handler.bind(this);
        this.id_to_colors = {};
      }

      add(id, parent_id, name, listener) {
        return super.add(id, parent_id, name, listener);
      }

      recolor_now() {
        boundMethodCheck(this, ColoredTreePicker);
        this.id_to_colors = this.recolor();
        return this.update_css();
      }

      get_my_style_id() {
        return `${this.get_my_id()}_colors`;
      }

      update_css() {
        var colors, ctxSel, id, nc, ref, sc, styles;
        if (this.style_sheet == null) {
          this.style_sheet = this.elem.append("style");
        }
        // .attr("id", @get_my_style_id())
        styles = `// ${this.get_my_id()}`;
        ctxSel = this.style_context_selector;
        if (ctxSel) {
          ctxSel += ' '; // put a space after ctxSel if it has content
        }
        if (ctxSel == null) {
          ctxSel = '';
        }
        ref = this.id_to_colors;
        for (id in ref) {
          colors = ref[id];
          nc = colors.unshowing;
          sc = colors.showing;
          styles += `\n${ctxSel}#${id}.treepicker-showing {\n   background-color:${sc};\n}\n${ctxSel}#${id}.treepicker-unshowing {\n   background-color:${nc};\n}\n${ctxSel}#${id}.treepicker-mixed,\n${ctxSel}#${id}.treepicker-indirect-mixed.treepicker-collapse {\n  background: linear-gradient(45deg, ${nc}, ${sc}, ${nc}, ${sc}, ${nc}, ${sc}, ${nc}, ${sc});\n  background-color: transparent;\n}`;
        }
        this.style_sheet.html(styles);
        if (false) { // cross-check the stylesheets to ensure proper loading
          if (this.style_sheet.html().length !== styles.length) {
            console.error("style_sheet_length error:", this.style_sheet.html().length, "<>", styles.length);
          } else {
            console.info("style_sheet_length good:", this.style_sheet.html().length, "==", styles.length);
          }
        }
      }

      recolor() {
        var branch, recursor, retval;
        recursor = {
          count: Object.keys(this.id_to_elem).length - this.get_abstract_count(),
          i: 0
        };
        retval = {};
        if (verbose) {
          console.log("RECOLOR");
        }
        branch = this.elem[0][0].children[0];
        this.recolor_recurse_DOM(retval, recursor, branch, "");
        return retval;
      }

      recolor_recurse_DOM(retval, recursor, branch, indent) {
        var branch_id, class_str, elem, i, len, ref;
        branch_id = branch.getAttribute("id");
        class_str = branch.getAttribute("class");
        if (verbose) {
          console.log(indent + "-recolor_recurse(", branch_id, class_str, ")", branch);
        }
        if (branch_id) {
          // should this go after recursion so color range can be picked up?
          this.recolor_node(retval, recursor, branch_id, branch, indent);
        }
        if (branch.children.length > 0) {
          ref = branch.children;
          for (i = 0, len = ref.length; i < len; i++) {
            elem = ref[i];
            if (elem != null) {
              class_str = elem.getAttribute("class");
              if (class_str.indexOf("treepicker-label") > -1) {
                continue;
              }
              this.recolor_recurse_DOM(retval, recursor, elem, indent + " |");
            }
          }
        }
        return retval;
      }

      recolor_node(retval, recursor, id, elem_raw, indent) {
        var elem, hue, ref;
        elem = d3.select(elem_raw);
        if (this.is_abstract(id)) {
          retval[id] = {
            unshowing: hsl2rgb(0, 0, L_unshowing),
            showing: hsl2rgb(0, 0, L_showing),
            emphasizing: hsl2rgb(0, 0, L_emphasizing)
          };
        } else {
          // https://en.wikipedia.org/wiki/HSL_and_HSV#HSL
          //   Adding .5 ensures hues are centered in their range, not at top.
          //   Adding 1 ensures different first and last colors, since 0 == 360
          hue = ((recursor.i + .5) / (recursor.count + 1)) * 360;
          recursor.i++; // post-increment to stay in the range below 360
          retval[id] = {
            unshowing: hsl2rgb(hue, S_all, L_unshowing),
            showing: hsl2rgb(hue, S_all, L_showing),
            emphasizing: hsl2rgb(hue, S_all, L_emphasizing)
          };
          if (verbose && ((ref = recursor.i) === 1 || ref === (recursor.count + 1))) {
            console.info(id, recursor, hue, retval[id]);
          }
        }
        if (verbose) {
          return console.log(indent + " - - - recolor_node(" + id + ")", retval[id].unshowing);
        }
      }

      get_current_color_forId(id) {
        var state;
        state = this.id_to_state[true][id];
        return this.get_color_forId_byName(id, state);
      }

      get_color_forId_byName(id, state_name) {
        var colors;
        id = this.uri_to_js_id(id);
        colors = this.id_to_colors[id];
        if (colors != null) {
          return colors[state_name];
        }
      }

      click_handler() {
        var id;
        boundMethodCheck(this, ColoredTreePicker);
        id = super.click_handler();
        return this.style_with_kid_color_summary_if_needed(id);
      }

      style_with_kid_color_summary_if_needed(id) {
        if (this.should_be_colored_by_kid_summary(id)) {
          return this.style_with_kid_color_summary(id);
        }
      }

      should_be_colored_by_kid_summary(id) {
        return !this.is_leaf(id) && this.id_is_collapsed[id];
      }

      collapse_by_id(id) {
        super.collapse_by_id(id);
        return this.style_with_kid_color_summary_if_needed(id);
      }

      expand_by_id(id) {
        if (this.should_be_colored_by_kid_summary(id)) {
          this.id_to_elem[id].attr("style", ""); // clear style set by set_gradient_style
        }
        return super.expand_by_id(id);
      }

      summarize_kid_colors(id, color_list) {
        var color, i, kid_id, kids, len;
        color_list = color_list || [];
        kids = this.id_to_children[id];
        if (!this.is_abstract[id]) {
          color = this.get_current_color_forId(id);
          if (color != null) {
            color_list.push(color);
          }
        }
        if (kids != null) {
          for (i = 0, len = kids.length; i < len; i++) {
            kid_id = kids[i];
            this.summarize_kid_colors(kid_id, color_list);
          }
        }
        return color_list;
      }

      style_with_kid_color_summary(id) {
        var color_list;
        color_list = this.summarize_kid_colors(id);
        if (color_list.length === 1) {
          color_list.push(color_list[0]);
        }
        if (color_list.length) {
          return this.set_gradient_style(id, color_list);
        }
      }

      set_gradient_style(id, kid_colors) {
        var colors, style;
        colors = kid_colors.join(', ');
        style = "background-color: transparent;";
        style += ` background: linear-gradient(45deg, ${colors})`;
        return this.id_to_elem[id].attr("style", style);
      }

      set_payload(id, value) {
        super.set_payload(id, value);
        // REVIEW it works but is this the right time to do this?
        // ensure collapsed nodes have summary colors updated
        return this.style_with_kid_color_summary_if_needed(id);
      }

    };

    ColoredTreePicker.prototype.container_regex = new RegExp("container");

    ColoredTreePicker.prototype.contents_regex = new RegExp("contents");

    return ColoredTreePicker;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).ColoredTreePicker = ColoredTreePicker;

}).call(this);

(function() {
  var Deprecated, Huviz,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  Huviz = require('huviz').Huviz;

  Deprecated = class Deprecated extends Huviz {
    constructor() {
      super(...arguments);
      this.onnextsubject = this.onnextsubject.bind(this);
      this.onnextsubject = this.onnextsubject.bind(this);
    }

    hide_all_links() {
      this.nodes.forEach((node) => {
        //node.linked = false;
        //node.fixed = false;	
        this.shelved_set.acquire(node);
        node.links_shown = [];
        node.showing_links = "none";
        this.shelved_set.acquire(node);
        return this.update_showing_links(node);
      });
      this.links_set.forEach((link) => {
        return this.remove_ghosts(link);
      });
      this.links_set.clear();
      this.chosen_set.clear();
      
      // It should not be neccessary to clear discarded_set or hidden_set()
      // because shelved_set.acquire() should have accomplished that
      return this.restart();
    }

    toggle_links() {
      //console.log("links",force.links());
      if (!this.links_set.length) {
        this.make_links(G);
        this.restart();
      }
      return this.force.links().length;
    }

    fire_nextsubject_event(oldquad, newquad) {
      //console.log "fire_nextsubject_event",oldquad
      return window.dispatchEvent(new CustomEvent('nextsubject', {
        detail: {
          old: oldquad,
          new: newquad
        },
        bubbles: true,
        cancelable: true
      }));
    }

    onnextsubject(e) {
      var subject;
      boundMethodCheck(this, Deprecated);
      alert("sproing");
      //console.log "onnextsubject: called",e
      // The event 'nextsubject' is fired when the subject of add_quad()
      // is different from the last call to add_quad().  It will also be
      // called when the data source has been exhausted. Our purpose
      // in listening for this situation is that this is when we ought
      // to check to see whether there is now enough information to create
      // a node.  A node must have an ID, a name and a type for it to
      // be worth making a node for it (at least in the orlando situation).
      // The ID is the uri (or the id if a BNode)
      this.calls_to_onnextsubject++;
      //console.log "count:",@calls_to_onnextsubject
      if (e.detail.old != null) {
        subject = this.my_graph.subjects[e.detail.old.s.raw];
        this.set_type_if_possible(subject, e.detail.old, true);
        if (this.is_ready(subject)) {
          this.get_or_create_node(subject);
          return this.tick();
        }
      }
    }

    show_found_links() {
      var sub_id, subj;
      for (sub_id in this.G.subjects) {
        subj = this.G.subjects[sub_id];
        subj.getValues("f:name").forEach((name) => {
          var node;
          if (name.match(this.search_regex)) {
            node = this.get_or_make_node(subj, [cx, cy]);
            if (node) {
              return this.show_node_links(node);
            }
          }
        });
      }
      return this.restart();
    }

    // deprecated in favour of get_or_create_node
    get_or_make_node(subject, start_point, linked, into_set) {
      var d, n_idx, name, name_obj;
      if (!subject) {
        return;
      }
      d = this.get_node_by_id(subject.id);
      if (d) {
        return d;
      }
      start_point = start_point || [this.width / 2, this.height / 2];
      linked = typeof linked === "undefined" || linked || false;
      name_obj = subject.predicates[FOAF_name].objects[0];
      name = (name_obj.value != null) && name_obj.value || name_obj;
      //name = subject.predicates[FOAF_name].objects[0].value
      d = new Node(subject.id);
      d.s = subject;
      d.name = name;
      d.point(start_point);
      d.prev_point([start_point[0] * 1.01, start_point[1] * 1.01]);
      this.assign_types(d);
      d.color = this.color_by_type(d);
      this.add_node_ghosts(d);
      //n_idx = @add_to_array(d, @nodes)
      n_idx = this.nodes.add(d);
      this.id2n[subject.id] = n_idx;
      if (false) {
        if (!linked) {
          n_idx = this.shelved_set.acquire(d);
          this.id2u[subject.id] = n_idx;
        } else {
          this.id2u[subject.id] = this.graphed_set.acquire(d);
        }
      } else {
        into_set = (into_set != null) && into_set || linked && this.graphed_set || this.get_default_set_by_type(d);
        into_set.acquire(d);
      }
      this.update_showing_links(d);
      return d;
    }

    find_links_from_node(node) {
      var oi, p_name, pnt, predicate, subj, target, x, y;
      target = void 0;
      subj = node.s;
      x = node.x || width / 2;
      y = node.y || height / 2;
      pnt = [x, y];
      oi = void 0;
      if (subj) {
        for (p_name in subj.predicates) {
          this.ensure_predicate(p_name);
          predicate = subj.predicates[p_name];
          oi = 0;
          predicate.objects.forEach((obj, i) => {
            if (obj.type === RDF_object) {
              target = this.get_or_make_node(this.G.subjects[obj.value], pnt);
            }
            if (target) {
              return this.add_link(new Edge(node, target));
            }
          });
        }
      }
      return node.links_from_found = true;
    }

    find_links_to_node(d) {
      var parent_point, subj;
      subj = d.s;
      if (subj) {
        parent_point = [d.x, d.y];
        this.G.get_incoming_predicates(subj).forEach((sid_pred) => {
          var pred, sid, src;
          sid = sid_pred[0];
          pred = sid_pred[1];
          src = this.get_or_make_node(this.G.subjects[sid], parent_point);
          return this.add_link(new Edge(src, d));
        });
      }
      return d.links_to_found = true;
    }

    set_type_if_possible(subj, quad, force) {
      var name, pred_id;
      // This is a hack, ideally we would look on the subject for type at coloring
      // and taxonomy assignment time but more thought is needed on how to
      // integrate the semantic perspective with the coloring and the 'taxonomy'.
      force = !(force == null) && force;
      if ((subj.type == null) && subj.type !== ORLANDO_writer && !force) {
        return;
      }
      //console.log "set_type_if_possible",force,subj.type,subj.id      
      pred_id = quad.p.raw;
      if ((pred_id === RDF_type || pred_id === 'a') && quad.o.value === FOAF_Group) {
        subj.type = ORLANDO_org;
      } else if (force && subj.id[0].match(this.bnode_regex)) {
        subj.type = ORLANDO_other;
      } else if (force) {
        subj.type = ORLANDO_writer;
      }
      if (subj.type != null) {
        return name = (subj.predicates[FOAF_name] != null) && subj.predicates[FOAF_name].objects[0] || subj.id;
      }
    }

    //console.log "   ",subj.type
    hide_all_links() {
      this.nodes.forEach((node) => {
        //node.linked = false;
        //node.fixed = false;	
        this.shelved_set.acquire(node);
        node.links_shown = [];
        node.showing_links = "none";
        this.shelved_set.acquire(node);
        return this.update_showing_links(node);
      });
      this.links_set.forEach((link) => {
        return this.remove_ghosts(link);
      });
      this.links_set.clear();
      this.chosen_set.clear();
      
      // It should not be neccessary to clear discarded_set or hidden_set()
      // because shelved_set.acquire() should have accomplished that
      return this.restart();
    }

    toggle_links() {
      //console.log("links",force.links());
      if (!this.links_set.length) {
        this.make_links(G);
        this.restart();
      }
      return this.force.links().length;
    }

    fire_nextsubject_event(oldquad, newquad) {
      //console.log "fire_nextsubject_event",oldquad
      return window.dispatchEvent(new CustomEvent('nextsubject', {
        detail: {
          old: oldquad,
          new: newquad
        },
        bubbles: true,
        cancelable: true
      }));
    }

    onnextsubject(e) {
      var subject;
      boundMethodCheck(this, Deprecated);
      alert("sproing");
      //console.log "onnextsubject: called",e
      // The event 'nextsubject' is fired when the subject of add_quad()
      // is different from the last call to add_quad().  It will also be
      // called when the data source has been exhausted. Our purpose
      // in listening for this situation is that this is when we ought
      // to check to see whether there is now enough information to create
      // a node.  A node must have an ID, a name and a type for it to
      // be worth making a node for it (at least in the orlando situation).
      // The ID is the uri (or the id if a BNode)
      this.calls_to_onnextsubject++;
      //console.log "count:",@calls_to_onnextsubject
      if (e.detail.old != null) {
        subject = this.my_graph.subjects[e.detail.old.s.raw];
        this.set_type_if_possible(subject, e.detail.old, true);
        if (this.is_ready(subject)) {
          this.get_or_create_node(subject);
          return this.tick();
        }
      }
    }

    show_found_links() {
      var sub_id, subj;
      for (sub_id in this.G.subjects) {
        subj = this.G.subjects[sub_id];
        subj.getValues("f:name").forEach((name) => {
          var node;
          if (name.match(this.search_regex)) {
            node = this.get_or_make_node(subj, [cx, cy]);
            if (node) {
              return this.show_node_links(node);
            }
          }
        });
      }
      return this.restart();
    }

    // deprecated in favour of get_or_create_node
    get_or_make_node(subject, start_point, linked, into_set) {
      var d, n_idx, name, name_obj;
      if (!subject) {
        return;
      }
      d = this.get_node_by_id(subject.id);
      if (d) {
        return d;
      }
      start_point = start_point || [this.width / 2, this.height / 2];
      linked = typeof linked === "undefined" || linked || false;
      name_obj = subject.predicates[FOAF_name].objects[0];
      name = (name_obj.value != null) && name_obj.value || name_obj;
      //name = subject.predicates[FOAF_name].objects[0].value
      d = new Node(subject.id);
      d.s = subject;
      d.name = name;
      d.point(start_point);
      d.prev_point([start_point[0] * 1.01, start_point[1] * 1.01]);
      this.assign_types(d);
      d.color = this.color_by_type(d);
      this.add_node_ghosts(d);
      //n_idx = @add_to_array(d, @nodes)
      n_idx = this.nodes.add(d);
      this.id2n[subject.id] = n_idx;
      if (false) {
        if (!linked) {
          n_idx = this.shelved_set.acquire(d);
          this.id2u[subject.id] = n_idx;
        } else {
          this.id2u[subject.id] = this.graphed_set.acquire(d);
        }
      } else {
        into_set = (into_set != null) && into_set || linked && this.graphed_set || this.get_default_set_by_type(d);
        into_set.acquire(d);
      }
      this.update_showing_links(d);
      return d;
    }

    find_links_from_node(node) {
      var oi, p_name, pnt, predicate, subj, target, x, y;
      target = void 0;
      subj = node.s;
      x = node.x || width / 2;
      y = node.y || height / 2;
      pnt = [x, y];
      oi = void 0;
      if (subj) {
        for (p_name in subj.predicates) {
          this.ensure_predicate(p_name);
          predicate = subj.predicates[p_name];
          oi = 0;
          predicate.objects.forEach((obj, i) => {
            if (obj.type === RDF_object) {
              target = this.get_or_make_node(this.G.subjects[obj.value], pnt);
            }
            if (target) {
              return this.add_link(new Edge(node, target));
            }
          });
        }
      }
      return node.links_from_found = true;
    }

    find_links_to_node(d) {
      var parent_point, subj;
      subj = d.s;
      if (subj) {
        parent_point = [d.x, d.y];
        this.G.get_incoming_predicates(subj).forEach((sid_pred) => {
          var pred, sid, src;
          sid = sid_pred[0];
          pred = sid_pred[1];
          src = this.get_or_make_node(this.G.subjects[sid], parent_point);
          return this.add_link(new Edge(src, d));
        });
      }
      return d.links_to_found = true;
    }

    set_type_if_possible(subj, quad, force) {
      var name, pred_id;
      // This is a hack, ideally we would look on the subject for type at coloring
      // and taxonomy assignment time but more thought is needed on how to
      // integrate the semantic perspective with the coloring and the 'taxonomy'.
      force = !(force == null) && force;
      if ((subj.type == null) && subj.type !== ORLANDO_writer && !force) {
        return;
      }
      //console.log "set_type_if_possible",force,subj.type,subj.id      
      pred_id = quad.p.raw;
      if ((pred_id === RDF_type || pred_id === 'a') && quad.o.value === FOAF_Group) {
        subj.type = ORLANDO_org;
      } else if (force && subj.id[0].match(this.bnode_regex)) {
        subj.type = ORLANDO_other;
      } else if (force) {
        subj.type = ORLANDO_writer;
      }
      if (subj.type != null) {
        return name = (subj.predicates[FOAF_name] != null) && subj.predicates[FOAF_name].objects[0] || subj.id;
      }
    }

  };

  //console.log "   ",subj.type
  (typeof exports !== "undefined" && exports !== null ? exports : this).Deprecated = Deprecated;

}).call(this);

(function() {
  var Edge;

  Edge = (function() {
    class Edge {
      constructor(source, target, predicate) {
        var a;
        this.source = source;
        this.target = target;
        this.predicate = predicate;
        // FIXME if everything already has .lid then remove the test "not a.lid?"
        this.id = ((function() {
          var i, len, ref, results;
          ref = [this.source, this.predicate, this.target];
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            a = ref[i];
            results.push((a.lid == null) && a.id || a.lid);
          }
          return results;
        }).call(this)).join(' ');
        this.lid = this.id;
        this.register();
        this.contexts = [];
        this;
      }

      register() {
        return this.predicate.add_inst(this);
      }

      register_context(context) {
        return this.contexts.push(context);
      }

      // context.register_context_for(this) # FIXME to see all assertions in a context
      isSelected() {
        return (this.source.selected != null) || (this.target.selected != null);
      }

      show() {
        return this.predicate.update_state(this, 'show');
      }

      unshow() {
        return this.predicate.update_state(this, 'unshow');
      }

      an_end_is_selected() {
        return (this.target.selected != null) || (this.source.selected != null);
      }

      unselect() {
        return this.predicate.update_state(this, 'unselect');
      }

      select() {
        return this.predicate.update_state(this, 'select');
      }

    };

    Edge.prototype.color = "lightgrey";

    return Edge;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Edge = Edge;

}).call(this);

(function() {
  // Edit UI - Jan 2017
  var EditController, FiniteStateMachine, indexdDBstore,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  FiniteStateMachine = require('fsm').FiniteStateMachine;

  indexdDBstore = require('indexeddbstoragecontroller');

  EditController = (function() {
    class EditController extends FiniteStateMachine {
      constructor(huviz) {
        super();
        //@huviz.set_edit_mode(true)
        this.toggle_edit_form = this.toggle_edit_form.bind(this);
        this.huviz = huviz;
        //TODO EditController should be loaded and checked when a dataset is loaded
        this.userValid = true; //TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
        //@userValid = false
        this.ensure_verbs();
        this.build_transitions();
        this.state = null;
      }

      build_transitions() {
        return this.transitions = {
          prepare: {
            target: 'prepared'
          },
          disable: {
            target: 'disabled'
          },
          enable: {
            target: 'prepared'
          }
        };
      }

      on__prepare() {
        var clearForm, new_viscanvas, saveForm, validateForm, viscanvas;
        if (this.userValid === true && !this.con) { //document.getElementsByClassName("edit-controls")[0] is undefined
          this.con = document.createElement("div");
          this.con.className = "edit-controls loggedIn";
          this.con.setAttribute("edit", "no");
          //@huviz.set_edit_mode(false)
          viscanvas = this.huviz.args.viscanvas_sel;
          new_viscanvas = viscanvas.replace('#', '');
          document.getElementById(new_viscanvas).appendChild(this.con);
          this.con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>CONTRIBUTE</div><div id='beta-note'>(Alpha)</div></div>";
          this.create_edit_form(this.con);
          this.con.getElementsByClassName("slider")[0].onclick = this.toggle_edit_form;
          //console.log(con.getElementsByTagName("form")[0])
          //console.log(con.getElementsByClassName("slider")[0])
          this.formFields = this.con.getElementsByTagName("form")[0];
          clearForm = this.formFields.getElementsByClassName("clearForm")[0];
          saveForm = this.formFields.getElementsByClassName("saveForm")[0];
          validateForm = this.formFields.getElementsByTagName('input');
          validateForm[0].addEventListener("input", this.validate_edit_form);
          validateForm[1].addEventListener("input", this.validate_edit_form);
          validateForm[2].addEventListener("input", this.validate_edit_form);
          clearForm.addEventListener("click", this.clear_edit_form);
          saveForm.addEventListener("click", this.save_edit_form);
          this.proposed_quad = null;
          this.controls = this.formFields;
          this.subject_input = this.formFields[0];
          this.predicate_input = this.formFields[1];
          return this.object_input = this.formFields[2];
        }
      }

      hide() {
        return $(this.con).hide();
      }

      show() {
        return $(this.con).show();
      }

      on__disable() {
        this.hide_verbs();
        return this.hide_form();
      }

      on__enable() {
        this.show_verbs();
        return this.show_form();
      }

      get_verb_set() {
        return {
          connect: this.huviz.human_term.connect, // aka link
          spawn: this.huviz.human_term.spawn, // aka instantiate
          specialize: this.huviz.human_term.specialize, // aka subclass / subpropertize
          annotate: this.huviz.human_term.annotate
        };
      }

      add_verbs() {
        var prepend, vset;
        vset = this.get_verb_set();
        this.huviz.gclui.verb_sets.unshift(vset);
        return this.huviz.gclui.add_verb_set(vset, (prepend = true));
      }

      ensure_verbs() {
        if (!this.my_verbs) {
          this.my_verbs = this.add_verbs();
          return this.hide_verbs();
        }
      }

      hide_verbs() {
        return this.my_verbs.style('display', 'none');
      }

      show_verbs() {
        return this.my_verbs.style('display', 'flex');
      }

      create_edit_form(toggleEdit) {
        var formNode;
        formNode = document.createElement('form');
        formNode.classList.add("cntrl-set", "edit-form");
        formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input id="predicate" name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>';
        formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>';
        formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>';
        toggleEdit.appendChild(formNode);
        return this.set_predicate_selector();
      }

      set_predicate_selector() {
        var availablePredicates, j, len, predicate, ref;
        //console.log("setting predicate selector in edit form")
        // Add predicates from Ontology for autocomplete box in edit form
        //pred_array = @huviz.predicate_set
        availablePredicates = [];
        if (this.huviz.predicate_set) {
          ref = this.huviz.predicate_set;
          for (j = 0, len = ref.length; j < len; j++) {
            predicate = ref[j];
            availablePredicates.push(predicate.lid);
          }
          availablePredicates.push("literal");
        } else {
          availablePredicates = ["A", "literal"];
        }
        return $("#predicate").autocomplete({
          source: availablePredicates,
          open: this.update_predicate_picked,
          close: this.update_predicate_picked,
          change: this.update_predicate_picked,
          position: {
            my: "left bottom",
            at: "left top"
          }
        });
      }

      update_predicate_picked(event, ui) {
        var new_pred_value;
        //if event.type is 'autocompletechange'
        new_pred_value = this.predicate_input.value;
        console.log(`${new_pred_value} is new predicate`);
        return this.validate_proposed_edge();
      }

      hide_form() {
        this.con.setAttribute("edit", "no");
        return this.con.classList.remove("edit-mode");
      }

      //@huviz.set_edit_mode(false)
      show_form() {
        this.con.setAttribute("edit", "yes");
        return this.con.classList.add("edit-mode");
      }

      toggle_edit_form() {
        var toggleEditMode;
        boundMethodCheck(this, EditController);
        toggleEditMode = this.con.getAttribute("edit");
        //debugger
        if (toggleEditMode === 'no') { //toggle switched to edit mode, then show form
          this.show_verbs();
          this.show_form();
        }
        if (toggleEditMode === 'yes') { //toggle switched to normal mode, then hide form
          this.hide_verbs();
          return this.hide_form();
        }
      }

      validate_edit_form(evt) {
        var elem, form, i, inputFields, j, ref, saveButton;
        form = this.controls;
        inputFields = form.getElementsByTagName('input');
        saveButton = form.getElementsByTagName('button')[0];
        for (i = j = 0, ref = inputFields.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
          elem = form.elements[i];
          if (elem.value === '') {
            saveButton.disabled = 'disabled';
            break;
          } else {
            saveButton.disabled = false;
          }
        }
        return this.adjust_object_datatype();
      }

      predicate_is_DatatypeProperty() {
        var current_value;
        // The job of figuring this out is best done in a method because:
        //   * a search up the superclasses of the predicate is needed
        //   * caching that answer might be needed for efficiency
        //   * heuristics in case of ambiguity might be required

        // We can get started on this by just responding to magic values in the predicate.
        //console.log("predicate_is_Datatype has been called")
        if (this.predicate_input) {
          window.THINGY = this.predicate_input;
          current_value = this.predicate_input.value;
          return current_value === 'literal';
        }
        return false;
      }

      adjust_object_datatype() {
        var placeholder_label;
        if (this.predicate_is_DatatypeProperty()) {
          this.object_datatype_is_literal = true;
          placeholder_label = "a literal value";
        } else {
          this.object_datatype_is_literal = false;
          placeholder_label = "object";
        }
        return this.object_input.setAttribute("placeholder", placeholder_label);
      }

      // if the predicate is of DatatypeProperty then
      //  0. replace placeholder to reflect data type needed in object
      //  1. object field will only accpet input according to appropriate type (i.e. literal string, number or date)
      save_edit_form() {
        var assrtSave, elem, form, i, inputFields, j, quad, ref, saveButton, tuple;
        form = this.controls;
        inputFields = form.getElementsByTagName('input');
        tuple = [];
        for (i = j = 0, ref = inputFields.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
          elem = form.elements[i];
          console.log(elem.name + ": " + elem.value);
          tuple.push(elem.value);
        }
        assrtSave = new indexdDBstore.IndexedDBStorageController(this.huviz);
        console.log(assrtSave);
        quad = {
          s: tuple[0],
          p: tuple[1],
          o: tuple[2]
        };
        this.latest_quad = quad; // REMOVE ONCE saving to the indexedDB is working
        this.huviz.set_proposed_edge(null); // set to nothing, ie stop flagging the edge as proposed
        //@huviz.dbsstorage.assert(quad)
        //assrtSave.assert(quad)
        saveButton = form.getElementsByTagName('button')[0];
        for (i in inputFields) {
          form.elements[i].value = '';
        }
        return saveButton.disabled = true;
      }

      //@proposed_quad = null #set to false (no focused edge)
      clear_edit_form() {
        var form, i, inputFields, saveButton;
        form = this.controls;
        inputFields = form.getElementsByTagName('input');
        saveButton = form.getElementsByTagName('button')[0];
        for (i in inputFields) {
          form.elements[i].value = '';
        }
        if (this.proposed_quad) {
          console.log("@proposed_quad:", this.proposed_quad);
          //@huviz.set_proposed_edge(null)
          this.remove_proposed_quad(); // clear existing edge clear from display
        }
        this.set_subject_node();
        this.set_object_node();
        return saveButton.disabled = true;
      }

      // TODO why on calling this function does the ability to drag nodes to fill form disabled?
      set_subject_node(node) {
        var new_value;
        if (this.subject_node === node) {
          return;
        }
        this.subject_node = node;
        new_value = node && node.id || "";
        console.log(`set_subject_node() id:'${new_value}'`);
        this.subject_input.setAttribute("value", new_value);
        this.validate_edit_form();
        return this.validate_proposed_edge();
      }

      set_object_node(node) { // either a node or undefined
        var new_value;
        if (this.object_node === node) { // ignore if there is no change
          return;
        }
        this.object_node = node; // might be null
        new_value = node && node.id || "";
        console.log(`set_object_node() id:'${new_value}'`);
        this.object_input.setAttribute("value", new_value);
        this.validate_edit_form();
        return this.validate_proposed_edge();
      }

      validate_proposed_edge() { // type = subject or object
        var RDF_literal, RDF_object, obj_type, object_id, predicate_val, q, subject_id;
        console.log('validate_proposed_edge()');
        // What are the proposed subject node, object node and predicate?
        // Subject and Object fields must have values (IDs of Nodes)
        // Make a quad out of current subject and object (predicate if it is filled)
        //subject_id = @editui.subject_input.value
        RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
        RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
        subject_id = this.subject_input.value;
        object_id = this.object_input.value;
        predicate_val = this.predicate_input.value;
        // propose a new quad once there is a subject and an object
        if (subject_id && object_id) {
          obj_type = predicate_val === 'literal' ? RDF_literal : RDF_object;
          q = {
            s: subject_id,
            p: predicate_val || "anything",
            o: {
              type: obj_type,
              value: object_id
            },
            g: "http://" + Date.now()
          };
          // Don't process any edge proposal if it is just the same as the current proposal
          // Ignore requests for edges that are identical to the last edge requested
          if ((this.proposed_quad != null) && this.quads_match(q, this.proposed_quad)) {
            console.log(`... skipping: <s:${q.s}, p:${q.p}, o:${q.o.value}> matches old`);
            return;
          }
          console.log(`... accepting: <s:${q.s}, p:${q.p}, o:${q.o.value}>`);
          return this.set_proposed_quad(q);
        }
      }

      quads_match(a, b) {
        return (a.s === b.s) && (a.p === b.p) && (a.o.value === b.o.value);
      }

      set_proposed_quad(new_q) {
        console.log("set_proposed_quad()");
        // If there is an existing edge remove it before setting a new proposed edge
        if (this.proposed_quad) { // There can only be one, so get rid of old proposed edge
          this.remove_proposed_quad();
        }
        this.add_proposed_quad(new_q);
        this.huviz.tick(); // tell the graph to repaint itself
        return console.log("Tick in editui.coffee set_proposed_quad");
      }

      add_proposed_quad(q) {
        var edge;
        console.log("add_proposed_quad() " + q.s + " " + q.p + " " + q.o.value);
        edge = this.huviz.add_quad(q);
        if (!edge) {
          debugger;
        }
        this.huviz.set_proposed_edge(edge);
        this.huviz.show_link(edge);
        return this.proposed_quad = q;
      }

      remove_proposed_quad() {
        var edge_id, old_edge;
        old_edge = this.huviz.proposed_edge;
        if (old_edge) {
          edge_id = old_edge.id;
          this.huviz.set_proposed_edge(null);
          //@huviz.remove_link(edge_id)
          //@huviz.unshow_link(old_edge)
          this.huviz.delete_edge(old_edge);
        }
        //delete @huviz.edges_by_id[old_edge]
        return this.proposed_quad = null;
      }

    };

    (typeof exports !== "undefined" && exports !== null ? exports : EditController).EditController = EditController;

    return EditController;

  }).call(this);

}).call(this);

(function() {
  // FiniteStateMachine implements a simple abstract engine for running state machines.

  // It supports optional methods for every transition and for become/leav a state.

  // There are three kinds of methods:
  // 1. on__TRANSITID called upon the commencement of the transition
  // 2. exit__STATEID called when leaving a state
  // 3. enter__STATEID called when becoming a state

  // All three kinds of methods are optional.  If no method of any kind is found
  // during a transition then a message is either thrown, logged or ignored based
  // on the value of this.throw_log_or_ignore

  // If there is an array at this.trace then the names of the method are pushed
  // onto it as they are called.

  // # Usage

  //     class MyFSM extends FiniteStateMachine
  //       constructor: (anything, you want) ->
  //         # you can do anything you want on your FSM constructor
  //       throw_log_or_ignore: 'ignore'
  //       transitions:
  //         start:
  //           target: 'ready'
  //         stop:
  //           source: 'ready' # TODO respect source by raising error if an illegal transit is tried
  //           target: 'stopped'
  //       on__start: ->
  //         console.log('on "start"')
  //       exit__ready: ->
  //         console.log('leave "ready"')
  //       enter__stopped: ->
  //         console.log('become "stopped"')

  //     myFSM = new MyFSM()
  //     myFSM.transit('start') ==> 'on "start"', 'leave "ready"'
  //     myFSM.get_state() ==> 'ready'
  //     myFSM.transit('stop') ==> 'become "stopped"'

  // Notes:
  //   suitable for use as a mixin
  //   https://coffeescript-cookbook.github.io/chapters/classes_and_objects/mixins
  var FiniteStateMachine;

  FiniteStateMachine = class FiniteStateMachine {
    call_method_by_name(meth_name) {
      var meth;
      if ((meth = this[meth_name])) {
        //if (meth = Reflect.get(this, meth_name))
        meth.call(this);
        if (this.trace) {
          this.trace.push(meth_name);
        }
        return true;
      }
      return false;
    }

    set_state(state) {
      var called;
      // call a method when arriving at the new state, if it exists
      called = this.call_method_by_name('enter__' + state);
      this.state = state; // set after calling meth_name so the old state is available to it
      return called;
    }

    exit_state() {
      // call a method when leaving the old state, if it exists
      return this.call_method_by_name('exit__' + this.state);
    }

    get_state() {
      return this.state;
    }

    is_state(candidate) {
      return this.state === candidate;
    }

    make_noop_msg(trans_id, old_state, new_state) {
      return this.constructor.name + " had neither " + `on__${trans_id} exit__${old_state} or enter__${new_state}`;
    }

    throw_log_or_ignore_msg(msg) {
      var throw_log_or_ignore;
      throw_log_or_ignore = this.throw_log_or_ignore || 'ignore';
      if (throw_log_or_ignore === 'throw') {
        throw new Error(msg);
      } else if (throw_log_or_ignore === 'log') {
        console.warn(msg);
      }
    }

    transit(trans_id) {
      var called, initial_state, msg, target_id, transition;
      if (this.transitions == null) {
        this.transitions = {};
      }
      if ((transition = this.transitions[trans_id])) {
        initial_state = this.state;
        called = this.call_method_by_name('on__' + trans_id);
        called = this.exit_state() || called;
        if ((target_id = transition.target)) {
          called = this.set_state(target_id) || called;
        }
        if (!called) {
          msg = this.make_noop_msg(trans_id, initial_state, target_id);
          this.throw_log_or_ignore_msg(msg);
        }
      } else {
        this.throw_log_or_ignore_msg(`${this.constructor.name} has no transition with id ${trans_id}`);
      }
    }

  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).FiniteStateMachine = FiniteStateMachine;

}).call(this);

(function() {
  /*
   * verbs: choose,label,discard,shelve,unlabel
   * classes: writers,others,people,orgs # places,titles
   * like:
   * ids:
   *
   *  choose,label/unlabel,discard,shelve,expand
   *
   */
  var ColoredTreePicker, CommandController, TreePicker, gcl, getRandomId,
    indexOf = [].indexOf;

  window.toggle_suspend_updates = function(val) {
    console.log("toggle_suspend_updates(#val)");
    if ((window.suspend_updates == null) || !window.suspend_updates) {
      window.suspend_updates = true;
    } else {
      window.suspend_updates = false;
    }
    if (val != null) {
      window.suspend_updates = val;
    }
    //console.warn "suspend_updates",window.suspend_updates
    return window.suspend_updates;
  };

  getRandomId = function(prefix) {
    var max;
    max = 10000000000;
    prefix = prefix || 'id';
    return prefix + Math.floor(Math.random() * Math.floor(max));
  };

  gcl = require('graphcommandlanguage');

  ColoredTreePicker = require('coloredtreepicker').ColoredTreePicker;

  TreePicker = require('treepicker').TreePicker;

  CommandController = (function() {
    class CommandController {
      constructor(huviz, container, hierarchy) {
        this.on_downloadscript_json_clicked = this.on_downloadscript_json_clicked.bind(this);
        this.on_downloadscript_txt_clicked = this.on_downloadscript_txt_clicked.bind(this);
        this.on_downloadscript_hybrid_clicked = this.on_downloadscript_hybrid_clicked.bind(this);
        this.on_downloadscript_type = this.on_downloadscript_type.bind(this);
        this.on_stashscript_clicked = this.on_stashscript_clicked.bind(this);
        this.on_rewind_click = this.on_rewind_click.bind(this);
        this.on_backward_click = this.on_backward_click.bind(this);
        this.on_forward_click = this.on_forward_click.bind(this);
        this.on_fastforward_click = this.on_fastforward_click.bind(this);
        this.on_dataset_loaded = this.on_dataset_loaded.bind(this);
        this.select_the_initial_set = this.select_the_initial_set.bind(this);
        this.NEW_select_the_initial_set = this.NEW_select_the_initial_set.bind(this);
        this.OLD_select_the_initial_set = this.OLD_select_the_initial_set.bind(this);
        this.handle_newpredicate = this.handle_newpredicate.bind(this);
        this.recolor_edges_and_predicates = this.recolor_edges_and_predicates.bind(this);
        this.add_predicate = this.add_predicate.bind(this);
        //@prepare_command(@new_GraphCommand( {}))
        this.handle_on_predicate_clicked = this.handle_on_predicate_clicked.bind(this);
        this.on_predicate_clicked = this.on_predicate_clicked.bind(this);
        this.recolor_edges = this.recolor_edges.bind(this);
        this.add_taxon = this.add_taxon.bind(this);
        this.onChangeEnglish = this.onChangeEnglish.bind(this);
        this.handle_on_taxon_clicked = this.handle_on_taxon_clicked.bind(this);
        this.on_taxon_clicked = this.on_taxon_clicked.bind(this);
        this.stop_working = this.stop_working.bind(this);
        this.handle_clear_like = this.handle_clear_like.bind(this);
        this.handle_like_input = this.handle_like_input.bind(this);
        this.disengage_all_verbs = this.disengage_all_verbs.bind(this);
        this.push_future_onto_history = this.push_future_onto_history.bind(this);
        this.update_command = this.update_command.bind(this);
        this.perform_current_command = this.perform_current_command.bind(this);
        this.handle_on_verb_clicked = this.handle_on_verb_clicked.bind(this);
        this.handle_on_set_picked = this.handle_on_set_picked.bind(this);
        this.disengage_all_sets = this.disengage_all_sets.bind(this);
        this.clear_all_sets = this.clear_all_sets.bind(this);
        this.on_set_count_update = this.on_set_count_update.bind(this);
        this.huviz = huviz;
        this.container = container;
        this.hierarchy = hierarchy;
        if (!this.huviz.all_set.length) {
          $(this.container).hide();
        }
        d3.select(this.container).html("");
        if (this.huviz.args.display_hints) {
          this.hints = d3.select(this.container).append("div").attr("class", "hints");
          $(".hints").append($(".hint_set").contents());
        }
        this.style_context_selector = this.huviz.get_picker_style_context_selector();
        this.make_command_history();
        this.control_label("Current Command");
        this.nextcommandbox = this.comdiv.append('div');
        this.make_verb_sets();
        this.control_label("Verbs");
        this.verbdiv = this.comdiv.append('div').attr('class', 'verbs');
        this.depthdiv = this.comdiv.append('div');
        this.add_clear_both(this.comdiv);
        //@node_pickers = @comdiv.append('div')
        this.node_pickers = this.comdiv.append('div').attr("id", "node_pickers");
        this.set_picker_box_parent = this.build_set_picker("Sets", this.node_pickers);
        this.taxon_picker_box_parent = this.build_taxon_picker("Class Selector", this.node_pickers);
        this.add_clear_both(this.comdiv);
        this.likediv = this.taxon_picker_box_parent.append('div');
        this.build_predicate_picker("Edges of the Selected Nodes");
        this.init_editor_data();
        this.build_form();
        this.update_command();
        this.install_listeners();
      }

      control_label(txt, what, title) {
        var label, outer;
        what = what || this.comdiv;
        outer = what.append('div');
        label = outer.append('div');
        label.classed("control_label", true).text(txt);
        if (title) {
          label.attr('title', title);
        }
        return outer;
      }

      new_GraphCommand(args) {
        return new gcl.GraphCommand(this.huviz, args);
      }

      reset_graph() {
        /*
        * unhide all
        * retrieve all
        * shelve all
        * sanity check set counts
         */
        //@huviz.run_command(@new_GraphCommand(
        //  verbs: ['unhide']
        //  sets: [@huviz.all_set]
        //  skip_history: true))
        this.huviz.walkBackAll();
        this.huviz.walk_path_set = [];
        this.huviz.run_command(this.new_GraphCommand({
          verbs: ['undiscard', 'unchoose', 'unselect', 'unpin', 'shelve', 'unlabel'],
          sets: [this.huviz.all_set.id],
          skip_history: true
        }));
        this.disengage_all_verbs();
        this.reset_command_history();
        return this.engaged_taxons = [];
      }

      make_command_history() {
        var history;
        this.comdiv = d3.select(this.container).append("div"); // --- Add a container
        history = d3.select(this.huviz.oldToUniqueTabSel['tabs-history']);
        this.cmdtitle = history.append('div').attr('class', 'control_label').html('Command History').attr('style', 'display:inline');
        this.scriptPlayerControls = history.append('div').attr('class', 'scriptPlayerControls');
        //  attr('style','position: relative;  float:right')
        this.scriptRewindButton = this.scriptPlayerControls.append('button').attr('title', 'rewind to start').attr('disabled', 'disabled').on('click', this.on_rewind_click);
        this.scriptRewindButton.append('i').attr("class", "fa fa-fast-backward");
        this.scriptBackButton = this.scriptPlayerControls.append('button').attr('title', 'go back one step').attr('disabled', 'disabled').on('click', this.on_backward_click);
        this.scriptBackButton.append('i').attr("class", "fa fa-play fa-flip-horizontal");
        this.scriptPlayButton = this.scriptPlayerControls.append('button').attr('title', 'play script step by step').attr('disabled', 'disabled').on('click', this.on_forward_click);
        this.scriptPlayButton.append('i').attr("class", "fa fa-play");
        //attr('style', 'display:none').
        this.scriptForwardButton = this.scriptPlayerControls.append('button').attr('title', 'play script continuously').attr('disabled', 'disabled').on('click', this.on_fastforward_click);
        this.scriptForwardButton.append('i').attr("class", "fa fa-fast-forward");
        this.scriptDownloadButton = this.scriptPlayerControls.append('button').attr('title', 'save script to file').attr('style', 'margin-left:1em').attr('disabled', 'disabled').on('click', this.on_downloadscript_hybrid_clicked); // ;display:none
        this.scriptDownloadButton.append('i').attr("class", "fa fa-download");
        //.append('span').text('.txt')
        this.scriptDownloadJsonButton = this.scriptPlayerControls.append('button').attr('title', 'save script as .json').attr('style', 'display:none').on('click', this.on_downloadscript_json_clicked); // ;display:none
        this.scriptDownloadJsonButton.append('i').attr("class", "fa fa-download").append('span').text('.json');
        this.scriptStashButton = this.scriptPlayerControls.append('button').attr('title', 'save script to menu').attr('disabled', 'disabled').attr('style', 'margin-left:.1em').on('click', this.on_stashscript_clicked);
        this.scriptStashButton.append('i').attr("class", "fa fa-bars");
        //.append('span').text('save to menu')

        //history.append('div')
        this.cmdlist = history.append('div').attr('class', 'commandlist');
        this.oldcommands = this.cmdlist.append('div').attr('class', 'commandhistory').style('max-height', `${this.huviz.height - 80}px`);
        this.commandhistoryElem = this.huviz.topElem.querySelector('.commandhistory');
        this.commandhistory_JQElem = $(this.commandhistoryElem);
        this.future_cmdArgs = [];
        this.command_list = [];
        return this.command_idx0 = 0;
      }

      reset_command_history() {
        var i, len, record, ref, results;
        ref = this.command_list;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          record = ref[i];
          results.push(record.elem.attr('class', 'command'));
        }
        return results;
      }

      get_downloadscript_name(ext) {
        return this.lastScriptName || ('HuVizScript.' + ext);
      }

      get_script_prefix() {
        return ["#!/bin/env huviz", "# This HuVis script file was generated by the page:", "#   " + this.huviz.get_reload_uri(), "# Generated at " + (new Date()).toISOString(), "", ""].join("\n");
      }

      get_script_body() {
        return this.get_script_prefix() + this.oldcommands.text();
      }

      get_script_body_as_json() {
        var cmd, cmdList, elem_and_cmd, i, len, ref, replacer;
        cmdList = [];
        if (this.huviz.dataset_loader.value) {
          cmdList.push({
            verbs: ['load'],
            data_uri: this.huviz.dataset_loader.value,
            ontologies: [this.huviz.ontology_loader.value],
            skip_history: true
          });
        }
        ref = this.command_list;
        for (i = 0, len = ref.length; i < len; i++) {
          elem_and_cmd = ref[i];
          cmd = elem_and_cmd.cmd;
          cmdList.push(cmd.args_or_str);
        }
        replacer = function(key, value) {
          var j, k, len1, len2, node_or_id, obj, retlist, setId, set_or_id;
          // replacer() removes non-literals from GraphCommand.args_or_script for serialization
          retlist = [];
          if (key === 'subjects') {
            for (j = 0, len1 = value.length; j < len1; j++) {
              node_or_id = value[j];
              if (!node_or_id.id) {
                console.debug("expecting node_or_id to have attribute .id", node_or_id);
              }
              if (node_or_id.id && node_or_id.lid) {
                // ideally send both the id (ie url) and the lid which is the pretty id
                obj = {
                  id: node_or_id.id,
                  lid: node_or_id.lid
                };
              }
              retlist.push(obj || node_or_id);
            }
            return retlist;
          }
          if (key === 'sets') {
            for (k = 0, len2 = value.length; k < len2; k++) {
              set_or_id = value[k];
              setId = set_or_id.id || set_or_id;
              retlist.push(setId);
            }
            return retlist;
          }
          return value;
        };
        return JSON.stringify(cmdList, replacer, 4);
      }

      get_script_body_as_hybrid() {
        // The "hybrid" script style consists of three parts
        //   1) the text version of the script
        //   2) the json_marker, a separator between the two parts
        //   3) the json version of the script
        return this.get_script_body() + "\n\n" + this.huviz.json_script_marker + "\n\n" + this.get_script_body_as_json();
      }

      make_txt_script_href() {
        var theBod, theHref;
        theBod = encodeURIComponent(this.get_script_body());
        theHref = "data:text/plain;charset=utf-8," + theBod;
        return theHref;
      }

      make_json_script_href() {
        var theHref, theJSON;
        theJSON = encodeURIComponent(this.get_script_body_as_json());
        theHref = "data:text/json;charset=utf-8," + theJSON;
        return theHref;
      }

      make_hybrid_script_href() {
        var theBod, theHref;
        theBod = encodeURIComponent(this.get_script_body_as_hybrid());
        theHref = "data:text/plain;charset=utf-8," + theBod;
        return theHref;
      }

      on_downloadscript_json_clicked() {
        this.on_downloadscript_type('json');
      }

      on_downloadscript_txt_clicked() {
        this.on_downloadscript_type('txt');
      }

      on_downloadscript_hybrid_clicked() {
        this.on_downloadscript_type('hybrid', 'txt');
      }

      on_downloadscript_type(scriptFileType, ext) {
        var node, theHref, thisName, transientLink;
        transientLink = this.scriptPlayerControls.append('a');
        transientLink.text('script');
        thisName = prompt("What would you like to call your saved script?", this.get_downloadscript_name(ext || scriptFileType));
        if (!thisName) {
          return;
        }
        this.lastScriptName = thisName;
        transientLink.attr('style', 'display:none');
        transientLink.attr('download', this.lastScriptName);
        if (scriptFileType === 'json') {
          theHref = this.make_json_script_href();
        } else if (scriptFileType === 'txt') {
          theHref = this.make_txt_script_href();
        } else if (scriptFileType === 'hybrid') {
          theHref = this.make_hybrid_script_href();
        }
        transientLink.attr('href', theHref);
        transientLink.node().click();
        node = transientLink.node();
        node.parentNode.removeChild(node);
      }

      on_stashscript_clicked() {
        var ext, scriptFileType, script_rec, thisName;
        scriptFileType = 'hybrid';
        ext = 'txt';
        thisName = prompt("What would you like to call this script in your menu?", this.get_downloadscript_name(ext || scriptFileType));
        if (!thisName) {
          return;
        }
        this.lastScriptName = thisName;
        script_rec = {
          uri: thisName,
          opt_group: 'Your Own',
          data: this.get_script_body_as_hybrid()
        };
        this.huviz.script_loader.add_local_file(script_rec);
      }

      on_rewind_click() {
        this.reset_graph();
        this.command_idx0 = 0;
        return this.update_script_buttons();
      }

      on_backward_click() {
        var forward_to_idx;
        forward_to_idx = this.command_idx0 - 1;
        this.on_rewind_click();
        return this.on_fastforward_click(forward_to_idx);
      }

      on_forward_click() {
        this.play_old_command_by_idx(this.command_idx0);
        this.command_idx0++;
        return this.update_script_buttons();
      }

      on_fastforward_click(forward_to_idx) {
        var results;
        if (forward_to_idx == null) {
          forward_to_idx = this.command_list.length;
        }
        results = [];
        while (this.command_idx0 < forward_to_idx) {
          results.push(this.on_forward_click());
        }
        return results;
      }

      play_old_command_by_idx(idx) {
        var record;
        record = this.command_list[idx];
        record.elem.attr('class', 'command played');
        return this.play_old_command(record.cmd);
      }

      play_old_command(cmd) {
        cmd.skip_history = true;
        cmd.skip_history_remove = true;
        return this.huviz.run_command(cmd);
      }

      install_listeners() {
        window.addEventListener('changePredicate', this.predicate_picker.onChangeState);
        window.addEventListener('changeTaxon', this.taxon_picker.onChangeState);
        return window.addEventListener('changeEnglish', this.onChangeEnglish);
      }

      on_dataset_loaded(evt) {
        if (evt.done == null) {
          $(this.container).show();
          this.show_succession_of_hints();
          this.huviz.perform_tasks_after_dataset_loaded();
          this.huviz.hide_state_msg();
          // FIXME is there a standards-based way to prevent this happening three times?
          return evt.done = true;
        }
      }

      show_succession_of_hints() {
        var i, len, ref, reminder;
        // Show the reminders, give them close buttons which reveal them in series
        $(".hints.hint_set").show();
        ref = $(".hints > .a_hint");
        for (i = 0, len = ref.length; i < len; i++) {
          reminder = ref[i];
          $(reminder).attr('style', 'position:relative');
          $(reminder).append('<i class="fa fa-close close_hint"></i>').on("click", (evt, ui) => {
            $(evt.target).parent().hide(); // hide reminder whose close was clicked
            if ($(evt.target).parent().next()) { // is there a next another
              $(evt.target).parent().next().show(); // then show it
            }
            return false; // so not all close buttons are pressed at once
          });
        }
        $(".hints > .a_hint").hide();
        return $(".hints > .a_hint").first().show();
      }

      select_the_initial_set() {
        this.OLD_select_the_initial_set();
      }

      NEW_select_the_initial_set() {
        // this does NOT function as a workaround for the problem like OLD_select_the_initial_set
        this.huviz.run_command(this.new_GraphCommand({
          verbs: ['select'],
          every_class: true,
          classes: ['Thing'],
          skip_history: true
        }));
        this.huviz.run_command(this.new_GraphCommand({
          verbs: ['unselect'],
          every_class: true,
          classes: ['Thing'],
          skip_history: true
        }));
        this.huviz.shelved_set.resort(); // TODO remove when https://github.com/cwrc/HuViz/issues/109
      }

      OLD_select_the_initial_set() {
        var rm_cmd, toggleEveryThing;
        // TODO initialize the taxon coloring without cycling all
        rm_cmd = () => { // more hideous hackery: remove toggleTaxonThing from script
          return this.delete_script_command_by_idx(0);
        };
        toggleEveryThing = () => {
          this.huviz.toggle_taxon("Thing", false); //, () -> alert('called'))
          return setTimeout(rm_cmd, 1000);
        };
        toggleEveryThing.call();
        // everyThingIsSelected = () =>
        //  @huviz.nodes.length is @huviz.selected_set.length
        // @check_until_then(everyThingIsSelected, toggleEveryThing)
        setTimeout(toggleEveryThing, 1200);
        setTimeout(this.push_future_onto_history, 1800);
        //@huviz.do({verbs: ['unselect'], sets: [], skip_history: true})
        this.huviz.shelved_set.resort(); // TODO remove when https://github.com/cwrc/HuViz/issues/109
      }

      check_until_then(checkCallback, thenCallback) {
        var intervalId, nag;
        nag = () => {
          if (checkCallback.call()) {
            clearInterval(intervalId);
            //alert('check_until_then() is done')
            return thenCallback.call();
          }
        };
        return intervalId = setInterval(nag, 30);
      }

      init_editor_data() {
        // operations common to the constructor and reset_editor
        this.shown_edges_by_predicate = {};
        this.unshown_edges_by_predicate = {};
        return this.engaged_taxons = []; // new SortedSet()
      }

      reset_editor() {
        this.clear_like();
        this.disengage_all_verbs();
        this.disengage_all_sets();
        this.clear_all_sets();
        this.init_editor_data();
        return this.update_command();
      }

      disengage_command() {
        this.clear_like();
        this.disengage_all_verbs();
        this.disengage_all_sets();
        return this.update_command();
      }

      disengage_all() {
        this.clear_like();
        this.disengage_all_sets();
        this.disengage_all_verbs();
        return this.update_command();
      }

      add_clear_both(target) {
        // keep taxonomydiv from being to the right of the verbdiv
        return target.append('div').attr('style', 'clear:both');
      }

      ignore_predicate(pred_id) {
        return this.predicates_ignored.push(pred_id);
      }

      handle_newpredicate(e) {
        var parent_lid, pred_lid, pred_name, pred_uri;
        pred_uri = e.detail.pred_uri;
        parent_lid = e.detail.parent_lid;
        pred_lid = e.detail.pred_lid;
        pred_name = e.detail.pred_name;
        if (indexOf.call(this.predicates_ignored, pred_uri) < 0) { // FIXME merge with predicates_to_ignore
          if (indexOf.call(this.predicates_ignored, pred_lid) < 0) { // FIXME merge with predicates_to_ignore
            if (pred_name == null) {
              pred_name = pred_lid.match(/([\w\d\_\-]+)$/g)[0];
            }
            this.add_predicate(pred_lid, parent_lid, pred_name);
            return this.recolor_edges_and_predicates_eventually(e);
          }
        }
      }

      recolor_edges_and_predicates_eventually() {
        if (this.recolor_edges_and_predicates_eventually_id != null) {
          // console.log "defer edges_and_predicates",@recolor_edges_and_predicates_eventually_id
          clearTimeout(this.recolor_edges_and_predicates_eventually_id);
        }
        return this.recolor_edges_and_predicates_eventually_id = setTimeout(this.recolor_edges_and_predicates, 300);
      }

      recolor_edges_and_predicates(evt) {
        this.predicate_picker.recolor_now();
        return this.recolor_edges(); // FIXME should only run after the predicate set has settled for some time
      }

      resort_pickers() {
        if (this.taxon_picker != null) {
          // propagate the labels according to the currently preferred language
          this.taxon_picker.resort_recursively();
          this.taxon_picker.recolor_now();
          this.huviz.recolor_nodes();
        }
        if (this.predicate_picker != null) {
          console.log("resorting of predicate_picker on hold until it does not delete 'anything'");
        }
      }

      //@predicate_picker?.resort_recursively()
      //@set_picker?.resort_recursively()
      build_predicate_picker(label) {
        var extra_classes, needs_expander, squash_case, title, use_name_as_label, where;
        this.predicates_id = this.huviz.unique_id('predicates_');
        title = "Medium color: all edges shown -- click to show none\n" + "Faint color: no edges are shown -- click to show all\n" + "Stripey color: some edges shown -- click to show all\n" + "Hidden: no edges among the selected nodes";
        where = (label != null) && this.control_label(label, this.comdiv, title) || this.comdiv;
        this.predicatebox = where.append('div').classed('container', true).attr('id', this.predicates_id);
        //@predicatebox.attr('class','scrolling')
        this.predicates_ignored = [];
        this.predicate_picker = new ColoredTreePicker(this.predicatebox, 'anything', (extra_classes = []), (needs_expander = true), (use_name_as_label = true), (squash_case = true), this.style_context_selector);
        this.predicate_hierarchy = {
          'anything': ['anything']
        };
        // FIXME Why is show_tree being called four times per node?
        this.predicate_picker.click_listener = this.handle_on_predicate_clicked;
        this.predicate_picker.show_tree(this.predicate_hierarchy, this.predicatebox);
        this.predicates_JQElem = $(this.predicates_id);
        this.predicates_JQElem.addClass("predicates ui-resizable").append("<br class='clear'>");
        return this.predicates_JQElem.resizable({
          handles: 's'
        });
      }

      add_predicate(pred_lid, parent_lid, pred_name) {
        //if pred_lid in @predicates_to_ignore
        //  return
        this.predicate_picker.add(pred_lid, parent_lid, pred_name, this.handle_on_predicate_clicked);
        return this.make_predicate_proposable(pred_lid);
      }

      make_predicate_proposable(pred_lid) {
        var predicate_ctl;
        predicate_ctl = this.predicate_picker.id_to_elem[pred_lid];
        predicate_ctl.on('mouseenter', () => {
          var every, nextStateArgs, ready;
          every = !!this.predicate_picker.id_is_collapsed[pred_lid];
          nextStateArgs = this.predicate_picker.get_next_state_args(pred_lid);
          if (nextStateArgs.new_state === 'showing') {
            this.proposed_verb = 'draw';
          } else {
            this.proposed_verb = 'undraw';
          }
          this.regarding = [pred_lid];
          this.regarding_every = !!this.predicate_picker.id_is_collapsed[pred_lid];
          ready = this.prepare_command(this.build_command());
        });
        return predicate_ctl.on('mouseleave', () => {
          this.proposed_verb = null;
          this.regarding = null;
          this.prepare_command(this.build_command());
        });
      }

      handle_on_predicate_clicked(pred_id, new_state, elem, args) {
        this.start_working();
        return setTimeout(() => { // run asynchronously so @start_working() can get a head start
          return this.on_predicate_clicked(pred_id, new_state, elem, args);
        });
      }

      on_predicate_clicked(pred_id, new_state, elem, args) {
        var cmd, skip_history, verb;
        skip_history = !args || !args.original_click;
        if (new_state === 'showing') {
          verb = 'draw';
        } else {
          verb = 'undraw';
        }
        cmd = this.new_GraphCommand({
          verbs: [verb],
          regarding: [pred_id],
          regarding_every: !!this.predicate_picker.id_is_collapsed[pred_id],
          sets: [this.huviz.selected_set.id],
          skip_history: skip_history
        });
        this.prepare_command(cmd);
        return this.huviz.run_command(this.command);
      }

      recolor_edges(evt) {
        var count, edge, i, len, node, pred_n_js_id, ref, results;
        count = 0;
        ref = this.huviz.all_set;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          node = ref[i];
          results.push((function() {
            var j, len1, ref1, results1;
            ref1 = node.links_from;
            results1 = [];
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              edge = ref1[j];
              count++;
              pred_n_js_id = edge.predicate.id;
              results1.push(edge.color = this.predicate_picker.get_color_forId_byName(pred_n_js_id, 'showing'));
            }
            return results1;
          }).call(this));
        }
        return results;
      }

      build_taxon_picker(label, where) {
        var extra_classes, id, needs_expander, squash_case, title, use_name_as_label;
        id = 'classes';
        title = "Medium color: all nodes are selected -- click to select none\n" + "Faint color: no nodes are selected -- click to select all\n" + "Stripey color: some nodes are selected -- click to select all\n";
        where = (label != null) && this.control_label(label, where, title) || this.comdiv;
        this.taxon_box = where.append('div').classed('container', true).attr('id', id);
        this.taxon_box.attr('style', 'vertical-align:top');
        // http://en.wikipedia.org/wiki/Taxon
        // documenting meaning of positional params with single use variables
        this.taxon_picker = new ColoredTreePicker(this.taxon_box, 'Thing', (extra_classes = []), (needs_expander = true), (use_name_as_label = true), (squash_case = true), this.style_context_selector);
        this.taxon_picker.click_listener = this.handle_on_taxon_clicked;
        this.taxon_picker.hover_listener = this.on_taxon_hovered;
        this.taxon_picker.show_tree(this.hierarchy, this.taxon_box);
        where.classed("taxon_picker_box_parent", true);
        return where;
      }

      add_taxon(taxon_id, parent_lid, class_name, taxon) {
        this.taxon_picker.add(taxon_id, parent_lid, class_name, this.handle_on_taxon_clicked);
        this.make_taxon_proposable(taxon_id);
        this.taxon_picker.recolor_now();
        return this.huviz.recolor_nodes();
      }

      make_taxon_proposable(taxon_id) {
        var taxon_ctl;
        taxon_ctl = this.taxon_picker.id_to_elem[taxon_id];
        taxon_ctl.on('mouseenter', (evt) => {
          var ready;
          //evt.stopPropagation()
          // REVIEW consider @taxon_picker.get_next_state_args(taxon_id) like make_predicate_proposable()
          this.proposed_taxon = taxon_id;
          this.proposed_every = !!this.taxon_picker.id_is_collapsed[taxon_id];
          if (!this.engaged_verbs.length) {
            // only presume that select/unselect is what is happening when no other verbs are engaged
            if (this.engaged_taxons.includes(taxon_id)) {
              this.proposed_verb = 'unselect';
            } else {
              this.proposed_verb = 'select';
            }
          }
          //console.log(@proposed_verb, @proposed_taxon)
          ready = this.prepare_command(this.build_command());
        });
        taxon_ctl.on('mouseleave', (evt) => {
          var ready;
          this.proposed_taxon = null;
          this.proposed_verb = null;
          ready = this.prepare_command(this.build_command());
        });
      }

      onChangeEnglish(evt) {
        this.object_phrase = evt.detail.english;
        //console.log("%c#{@object_phrase}",'color:orange;font-size:2em')
        this.prepare_command(this.build_command());
        return this.update_command();
      }

      handle_on_taxon_clicked(id, new_state, elem, args) {
        this.start_working();
        return setTimeout(() => { // run asynchronously so @start_working() can get a head start
          return this.on_taxon_clicked(id, new_state, elem, args);
        });
      }

      set_taxa_click_storm_callback(callback) {
        if (this.taxa_click_storm_callback != null) {
          throw new Error("taxa_click_storm_callback already defined");
        } else {
          return this.taxa_click_storm_callback = callback;
        }
      }

      taxa_being_clicked_increment() {
        if (this.taxa_being_clicked == null) {
          this.taxa_being_clicked = 0;
        }
        this.taxa_being_clicked++;
      }

      taxa_being_clicked_decrement() {
        if (this.taxa_being_clicked == null) {
          throw new Error("taxa_being_clicked_decrement() has apparently been called before taxa_being_clicked_increment()");
        }
        //@taxa_being_clicked ?= 1
        //console.log("taxa_being_clicked_decrement() before:", @taxa_being_clicked)
        this.taxa_being_clicked--;
        //console.log("taxa_being_clicked_decrement() after:", @taxa_being_clicked)
        if (this.taxa_being_clicked === 0) {
          //console.log("taxa click storm complete after length #{@taxa_click_storm_length}")
          //debugger if @taxa_click_storm_callback?
          if (this.taxa_click_storm_callback != null) {
            this.taxa_click_storm_callback.call(document);
            return this.taxa_click_storm_callback = null;
          }
        }
      }

      //@taxa_click_storm_length = 0
      //else
      //  blurt(@taxa_being_clicked, null, true)
      //  @taxa_click_storm_length ?= 0
      //  @taxa_click_storm_length++

      make_run_transient_and_cleanup_callback(because) {
        return (err) => {
          if (err) {
            console.log(err);
            throw err;
          }
          this.huviz.clean_up_all_dirt();
          this.run_any_immediate_command({});
          this.perform_any_cleanup(because);
        };
      }

      on_taxon_clicked(taxonId, new_state, elem, args) {
        var because, cmd, every_class, hasVerbs, old_state, skip_history, taxon;
        if (args == null) {
          args = {};
        }
        // This method is called in various contexts:
        // 1) aVerb ______ .      Engage a taxon, run command, disengage taxon
        // 2) _____ ______ .      Engage a taxon
        // 3) _____ aTaxon .      Disengage a taxon
        // 4) _____ a and b .     Engage or disenage a taxon

        // These variables are interesting regardless of which scenario holds
        taxon = this.huviz.taxonomy[taxonId];
        hasVerbs = !!this.engaged_verbs.length;
        skip_history = !args.original_click;
        every_class = !!args.collapsed; // force boolean value and default false
        // If there is already a verb engaged then this click should be running
        //     EngagedVerb taxonWith_id .
        //   In particular, the point being made here is that it is just the
        //   taxon given by taxonId which will be involved, not the selected_set
        //   or any other nodes.

        //   Let us have some examples as a sanity check:
        //     Select taxonId .    # cool
        //     Label  taxonId .    # no problemo
        //       *       *         # OK, OK looks straight forward
        if (hasVerbs) {
          cmd = this.new_GraphCommand({
            verbs: this.engaged_verbs,
            classes: [taxonId],
            every_class: every_class,
            skip_history: skip_history
          });
          this.huviz.run_command(cmd);
          return;
        }
        // If there is no verb engaged then this click should either engage or
        // disengage the taxon identified by id as dictated by new_state.

        // The following implements the tristate behaviour:
        //   Mixed —> On
        //   On —> Off
        //   Off —> On
        if (taxon != null) {
          old_state = taxon.get_state();
        } else {
          throw "Uhh, there should be a root Taxon 'Thing' by this point: " + taxonId;
        }
        if (new_state === 'showing') {
          if (old_state === 'mixed' || old_state === 'unshowing' || old_state === 'empty') {
            if (!(indexOf.call(this.engaged_taxons, taxonId) >= 0)) {
              this.engaged_taxons.push(taxonId);
            }
            // SELECT all members of the currently chosen classes
            cmd = this.new_GraphCommand({
              verbs: ['select'],
              classes: [taxonId],
              every_class: every_class,
              skip_history: skip_history
            });
          } else {
            //classes: (class_name for class_name in @engaged_taxons)
            console.error(`no action needed because ${taxonId}.${old_state} == ${new_state}`);
          }
        } else if (new_state === 'unshowing') {
          this.unselect_node_class(taxonId);
          cmd = this.new_GraphCommand({
            verbs: ['unselect'],
            classes: [taxonId],
            every_class: every_class,
            skip_history: skip_history
          });
        } else if (old_state === "hidden") {
          console.error(`${taxonId}.old_state should NOT equal 'hidden' here`);
        }
        this.taxon_picker.style_with_kid_color_summary_if_needed(taxonId);
        if (cmd != null) {
          this.huviz.run_command(cmd, this.make_run_transient_and_cleanup_callback(because));
          because = {}; // clear the because
        }
        this.update_command();
      }

      unselect_node_class(node_class) {
        // removes node_class from @engaged_taxons
        return this.engaged_taxons = this.engaged_taxons.filter(function(eye_dee) {
          return eye_dee !== node_class;
        });
      }

      // # Elements may be in one of these states:
      //   mixed      - some instances of the node class are selected, but not all
      //   unshowing  - a light color indicating nothing of that type is selected
      //   showing    - a medium color indicating all things of that type are selected
      //   abstract   - the element represents an abstract superclass,
      //                presumably containing concrete node classes

      //   hidden     - TBD: not sure when hidden is appropriate
      //   emphasized - TBD: mark the class of the focused_node
      make_verb_sets() {
        this.verb_sets = [ // mutually exclusive within each set
          {
            choose: this.huviz.human_term.choose,
            unchoose: this.huviz.human_term.unchoose,
            wander: this.huviz.human_term.wander,
            walk: this.huviz.human_term.walk
          },
          {
            select: this.huviz.human_term.select,
            unselect: this.huviz.human_term.unselect
          },
          {
            label: this.huviz.human_term.label,
            unlabel: this.huviz.human_term.unlabel
          },
          {
            shelve: this.huviz.human_term.shelve,
            hide: this.huviz.human_term.hide
          },
          {
            discard: this.huviz.human_term.discard,
            undiscard: this.huviz.human_term.undiscard
          },
          {
            pin: this.huviz.human_term.pin,
            unpin: this.huviz.human_term.unpin
          }
        ];
        if (this.huviz.show_hunt_verb) {
          return this.verb_sets.push({
            hunt: this.huviz.human_term.hunt
          });
        }
      }

      should_be_immediate_mode() {
        return !this.is_verb_phrase_empty() && this.is_command_object_empty() && !this.liking_all_mode;
      }

      is_command_object_empty() {
        return this.huviz.selected_set.length === 0 && (this.chosen_set == null);
      }

      is_verb_phrase_empty() {
        return this.engaged_verbs.length === 0;
      }

      auto_change_verb_if_warranted(node) {
        var next_verb, test, verb;
        if (this.huviz.edit_mode) {
          return;
        }
        if (this.immediate_execution_mode) {
          // If there is only one verb, then do auto_change
          if (this.engaged_verbs.length === 1) {
            verb = this.engaged_verbs[0];
            test = this.auto_change_verb_tests[verb];
            if (test) {
              next_verb = test(node, this.engaged_verbs[0]);
              if (next_verb) {
                this.engage_verb(next_verb, verb === this.transient_verb_engaged);
              }
            }
          }
          return this.huviz.set_cursor_for_verbs(this.engaged_verbs); // no verbs are engaged
        } else {
          return this.huviz.set_cursor_for_verbs([]);
        }
      }

      build_form() {
        this.build_verb_form();
        this.build_depth();
        this.build_like();
        this.nextcommand = this.nextcommandbox.append('div').attr('class', 'nextcommand command');
        // Where the full command string to appear as plain text, eg:
        //    "____ every Thing."
        //    "shelve every Person."
        this.nextcommandstr = this.nextcommand.append('code');
        $(this.nextcommandstr[0][0]).addClass('nextcommand_str');
        if (this.nextcommand_prompts_visible && this.nextcommand_str_visible) {
          this.nextcommand.append('hr');
        }
        // Where the broken out versions of the command string, with prompts, goes.
        this.nextcommand_prompts = this.nextcommand.append('code');
        this.nextcommand_prompts.attr('class', 'nextcommand_prompt');
        this.nextcommand_verb_phrase = this.nextcommand_prompts.append('span');
        this.nextcommand_verb_phrase.attr('class', 'verb_phrase');
        this.nextcommand_noun_phrase = this.nextcommand_prompts.append('span');
        this.nextcommand_noun_phrase.attr('class', 'noun_phrase');
        this.nextcommand_suffix_phrase = this.nextcommand_prompts.append('span');
        this.nextcommand_suffix_phrase.attr('class', 'suffix_phrase');
        if (this.nextcommand_prompts_visible) {
          $(this.nextcommand_prompts[0][0]).show();
        } else {
          $(this.nextcommand_prompts[0][0]).hide();
        }
        if (this.nextcommand_str_visible) {
          $(this.nextcommandstr[0][0]).show();
        } else {
          $(this.nextcommandstr[0][0]).hide();
        }
        this.nextcommand_working = this.nextcommand.append('div').attr('class', 'cmd-spinner');
        this.nextcommand_working.style('float:right; color:red; display:none;');
        return this.build_submit();
      }

      start_working() {
        log_click();
        if (this.already_working) {
          clearTimeout(this.already_working);
        } else {
          //console.log "start_working()"
          //console.log "already working", @already_working
          this.show_working_on();
        }
        return this.already_working = setTimeout(this.stop_working, this.working_timeout);
      }

      stop_working() {
        this.show_working_off();
        return this.already_working = void 0;
      }

      show_working_on(cmd) {
        //console.log "show_working_on()"
        if ((cmd != null) && !cmd.skip_history) {
          this.push_command_onto_history(cmd);
        }
        this.nextcommand_working.attr('class', 'fa fa-spinner fa-spin'); // PREFERRED fa-2x
        return this.nextcommand.attr('class', 'nextcommand command cmd-working');
      }

      show_working_off() {
        //console.log "show_working_off()"
        this.nextcommand_working.attr('class', '');
        return this.nextcommand.attr('class', 'nextcommand command');
      }

      //@nextcommand.attr('style','background-color:yellow') # PREFERRED
      build_depth() {
        this.depthdiv.text('Activate/Wander Depth:').classed("control_label activate_depth", true);
        this.depthdiv.style('display', 'none'); //('display','inline-block')
        this.depthdiv.style('white-space', 'nowrap');
        this.depth_input = this.depthdiv.append('input');
        this.depth_input.attr('class', 'depth_input');
        this.depth_input.attr('placeholder', '1');
        this.depth_input.attr('type', 'number');
        this.depth_input.attr('min', '1');
        this.depth_input.attr('max', '9');
        return this.depth_input.attr('value', '1');
      }

      build_like() {
        this.likediv.text('matching:').classed("control_label", true);
        this.likediv.style('display', 'inline-block');
        this.likediv.style('white-space', 'nowrap');
        this.like_input = this.likediv.append('input');
        this.like_input.attr('class', 'like_input');
        this.like_input.attr('placeholder', 'node Name');
        this.liking_all_mode = false; // rename to @liking_mode
        this.like_input.on('input', this.handle_like_input);
        this.clear_like_button = this.likediv.append('button').text('⌫');
        this.clear_like_button.attr('type', 'button').classed('clear_like', true);
        this.clear_like_button.attr('disabled', 'disabled');
        this.clear_like_button.attr('title', 'clear the "matching" field');
        return this.clear_like_button.on('click', this.handle_clear_like);
      }

      handle_clear_like(evt) {
        this.like_input.property('value', '');
        return this.handle_like_input();
      }

      handle_like_input(evt) {
        var TODO, like_has_a_value, like_value;
        like_value = this.get_like_string();
        like_has_a_value = !!like_value;
        if (like_has_a_value) {
          this.clear_like_button.attr('disabled', null);
          if (this.liking_all_mode) { 
            TODO = "update the selection based on the like value";
          } else {
            //@update_command(evt) # update the impact of the value in the like input
            this.liking_all_mode = true;
            this.chosen_set_before_liking_all = this.chosen_set_id;
            this.set_immediate_execution_mode(this.is_verb_phrase_empty());
            this.huviz.click_set("all"); // ie choose the 'All' set
        // like does not have a value
          }
        } else {
          this.clear_like_button.attr('disabled', 'disabled');
          if (this.liking_all_mode) { // but it DID
            TODO = "restore the state before liking_all_mode " + "eg select a different set or disable all set selection";
            //alert(TODO+" was: #{@chosen_set_before_liking_all}")
            if (this.chosen_set_before_liking_all) {
              this.huviz.click_set(this.chosen_set_before_liking_all);
              this.chosen_set_before_liking_all = void 0; // forget all about it
            } else {
              this.huviz.click_set('all'); // this should toggle OFF the selection of 'All'
            }
            this.liking_all_mode = false;
            this.set_immediate_execution_mode(true); // nothing has happened, so
          } else {
            //@update_command(evt) # does this deal with that moment when it becomes blanked?
            TODO = "do nothing ????";
          }
        }
        return this.update_command(evt);
      }

      build_submit() {
        this.doit_butt = this.nextcommand.append('span').append("input").attr("style", "float:right;").attr("type", "submit").attr('value', 'GO!').attr('class', 'doit_button');
        this.doit_butt.on('click', () => {
          if (this.update_command()) {
            return this.huviz.run_command(this.command);
          }
        });
        //@huviz.update_all_counts()  # TODO Try to remove this, should be auto
        return this.set_immediate_execution_mode(true);
      }

      enable_doit_button() {
        return this.doit_butt.attr('disabled', null);
      }

      disable_doit_button() {
        return this.doit_butt.attr('disabled', 'disabled');
      }

      hide_doit_button() {
        return $(this.doit_butt[0][0]).hide();
      }

      show_doit_button() {
        return $(this.doit_butt[0][0]).show();
      }

      set_immediate_execution_mode(which) {
        if (which) {
          this.hide_doit_button();
        } else {
          this.show_doit_button();
        }
        return this.immediate_execution_mode = which;
      }

      update_immediate_execution_mode_as_warranted() {
        return this.set_immediate_execution_mode(this.should_be_immediate_execution_mode());
      }

      disengage_all_verbs() {
        var i, len, ref, results, vid;
        ref = this.engaged_verbs;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          vid = ref[i];
          results.push(this.disengage_verb(vid));
        }
        return results;
      }

      unselect_all_node_classes() {
        var i, len, nid, ref, results;
        ref = this.engaged_taxons;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          nid = ref[i];
          this.unselect_node_class(nid);
          results.push(this.taxon_picker.set_direct_state(nid, 'unshowing'));
        }
        return results;
      }

      clear_like() {
        return this.huviz.like_string();
      }

      get_like_string() {
        return this.like_input[0][0].value;
      }

      push_command(cmd) {
        throw new Error('DEPRECATED');
        return this.push_command_onto_history(cmd);
      }

      push_cmdArgs_onto_future(cmdArgs) {
        return this.future_cmdArgs.push(cmdArgs);
      }

      push_future_onto_history() {
        var cmdArgs, i, len, ref;
        if (this.future_cmdArgs.length) {
          this.huviz.goto_tab(3);
          ref = this.future_cmdArgs;
          for (i = 0, len = ref.length; i < len; i++) {
            cmdArgs = ref[i];
            this.push_command_onto_history(this.new_GraphCommand(cmdArgs));
          }
          this.reset_command_history();
          this.command_idx0 = 0;
          return this.update_script_buttons();
        }
      }

      push_command_onto_history(cmd) {
        var delete_button, elem, elem_and_cmd, idx_of_this_command;
        // Maybe the command_pointer is in the middle of the command_list and here
        // we are trying to run a new command -- so we need to dispose of the remaining
        // commands in the command_list because the user is choosing to take a new path.
        this.clear_unreplayed_commands_if_needed();
        cmd.id = getRandomId('cmd');
        elem = this.oldcommands.append('div').attr('class', 'played command').attr('id', cmd.id);
        this.commandhistory_JQElem.scrollTop(this.commandhistory_JQElem.scrollHeight);
        elem_and_cmd = {
          elem: elem,
          cmd: cmd
        };
        this.command_list.push(elem_and_cmd);
        this.command_idx0 = this.command_list.length;
        idx_of_this_command = this.command_idx0;
        // we are appending to the end of the script, playing is no longer valid, so...
        this.disable_play_buttons();
        elem.text(cmd.str + "\n"); // add CR for downloaded scripts
        delete_button = elem.append('a');
        delete_button.attr('class', 'delete-command');
        delete_button.on('click', () => {
          return this.delete_script_command_by_id(cmd.id);
        });
        return this.update_script_buttons();
      }

      clear_unreplayed_commands_if_needed() {
        while (this.command_idx0 < this.command_list.length) {
          this.delete_script_command_by_idx(this.command_list.length - 1);
        }
      }

      delete_script_command_by_id(cmd_id) {
        var elem_and_cmd, i, idx, len, ref;
        ref = this.command_list;
        for (idx = i = 0, len = ref.length; i < len; idx = ++i) {
          elem_and_cmd = ref[idx];
          if (elem_and_cmd.cmd.id === cmd_id) {
            this.delete_script_command_by_idx(idx);
            break;
          }
        }
      }

      delete_script_command_by_idx(idx) {
        var elem, elem_and_cmd, orphan, pops;
        elem_and_cmd = this.command_list.splice(idx, 1)[0];
        //alert("about to delete: " + elem_and_cmd.cmd.str)
        elem = elem_and_cmd.elem[0];
        if (!elem || !elem[0]) {
          return;
        }
        orphan = elem[0];
        pops = orphan.parentNode;
        pops.removeChild(orphan);
        if (idx < this.command_idx0) {
          this.command_idx0--;
        }
        if (this.command_idx0 < 0) {
          this.command_idx0 = 0;
        }
        return this.update_script_buttons();
      }

      update_script_buttons() {
        if (this.command_list.length > 1) {
          this.enable_save_buttons();
        } else {
          this.disable_save_buttons();
        }
        if (this.command_idx0 >= this.command_list.length) {
          this.disable_play_buttons();
        } else {
          this.enable_play_buttons();
        }
        if (this.command_idx0 > 0) {
          this.enable_back_buttons();
        }
        if (this.command_idx0 <= 0) {
          return this.disable_back_buttons();
        }
      }

      disable_play_buttons() {
        this.scriptPlayButton.attr('disabled', 'disabled');
        return this.scriptForwardButton.attr('disabled', 'disabled');
      }

      enable_play_buttons() {
        this.scriptForwardButton.attr('disabled', null);
        return this.scriptPlayButton.attr('disabled', null);
      }

      disable_back_buttons() {
        this.scriptBackButton.attr('disabled', 'disabled');
        return this.scriptRewindButton.attr('disabled', 'disabled');
      }

      enable_back_buttons() {
        this.scriptBackButton.attr('disabled', null);
        return this.scriptRewindButton.attr('disabled', null);
      }

      disable_save_buttons() {
        this.scriptDownloadButton.attr('disabled', 'disabled');
        return this.scriptStashButton.attr('disabled', 'disabled');
      }

      enable_save_buttons() {
        this.scriptDownloadButton.attr('disabled', null);
        return this.scriptStashButton.attr('disabled', null);
      }

      build_command() {
        var args, class_name, i, len, like_str, ref, v;
        args = {
          verbs: []
        };
        args.object_phrase = this.object_phrase;
        if (this.engaged_verbs.length > 0) {
          ref = this.engaged_verbs;
          for (i = 0, len = ref.length; i < len; i++) {
            v = ref[i];
            if (v !== this.transient_verb_engaged) {
              args.verbs.push(v);
            }
          }
        }
        if ((this.regarding != null) && this.regarding.length) {
          args.regarding = this.regarding.slice(); // ie copy
          args.regarding_every = this.regarding_every;
        }
        if (this.proposed_verb) {
          args.verbs.push(this.proposed_verb);
        }
        if (this.chosen_set_id) {
          args.sets = [this.chosen_set];
        } else if (this.proposed_set) {
          args.sets = [this.proposed_set];
        } else {
          if (this.proposed_taxon) {
            args.every_class = this.proposed_every;
            args.classes = [this.proposed_taxon]; // proposed_taxon dominates engaged_taxons and the selected_set equally
          } else {
            if (this.engaged_taxons.length > 0) {
              args.classes = (function() {
                var j, len1, ref1, results;
                ref1 = this.engaged_taxons;
                results = [];
                for (j = 0, len1 = ref1.length; j < len1; j++) {
                  class_name = ref1[j];
                  results.push(class_name);
                }
                return results;
              }).call(this);
            }
            if (this.huviz.selected_set.length > 0) {
              args.sets = ['selected'];
            }
          }
        }
        like_str = (this.like_input[0][0].value || "").trim();
        if (like_str) {
          args.like = like_str;
        }
        return this.command = this.new_GraphCommand(args);
      }

      is_proposed() {
        return this.proposed_verb || this.proposed_set || this.proposed_taxon;
      }

      update_command(because) {
        //console.log("update_command()", because)
        because = because || {};
        this.huviz.show_state_msg("update_command");
        this.run_any_immediate_command(because);
        return this.huviz.hide_state_msg();
      }

      run_any_immediate_command(because) {
        var ready;
        //console.log("run_any_immediate_command()", because)
        ready = this.prepare_command(this.build_command());
        if (ready && this.huviz.doit_asap && this.immediate_execution_mode && !this.is_proposed()) {
          this.perform_current_command(because);
        }
      }

      perform_current_command(because) {
        var start;
        this.show_working_on(this.command);
        if (this.huviz.slow_it_down) {
          start = Date.now();
          while (Date.now() < start + (this.huviz.slow_it_down * 1000)) {
            console.log(Math.round((Date.now() - start) / 1000));
          }
        }
        //alert("About to execute:\n  "+@command.str)
        this.command.execute();
        this.huviz.update_all_counts();
        this.perform_any_cleanup(because);
        return this.show_working_off();
      }

      perform_any_cleanup(because) {
        //console.log("perform_any_cleanup()",because)
        if ((because != null) && because.cleanup) {
          because.cleanup();
          this.update_command();
        }
      }

      prepare_command(cmd) {
        this.command = cmd;
        if (this.nextcommand_prompts_visible || true) { // NEEDED BY huviz_test.js
          this.nextcommand_verb_phrase.text(this.command.verb_phrase);
          if (this.command.verb_phrase_ready) {
            $(this.nextcommand_verb_phrase[0][0]).addClass('nextcommand_prompt_ready').removeClass('nextcommand_prompt_unready');
          } else {
            $(this.nextcommand_verb_phrase[0][0]).removeClass('nextcommand_prompt_ready').addClass('nextcommand_prompt_unready');
          }
          this.nextcommand_noun_phrase.text(this.command.noun_phrase);
          if (this.command.noun_phrase_ready) {
            $(this.nextcommand_noun_phrase[0][0]).addClass('nextcommand_prompt_ready').removeClass('nextcommand_prompt_unready');
          } else {
            $(this.nextcommand_noun_phrase[0][0]).removeClass('nextcommand_prompt_ready').addClass('nextcommand_prompt_unready');
          }
          this.nextcommand_suffix_phrase.text(this.command.suffix_phrase);
        }
        if (this.nextcommand_str_visible || true) { // NEEDED BY huviz_test.js
          this.nextcommandstr.text(this.command.str);
        }
        if (this.command.ready) {
          this.enable_doit_button();
        } else {
          this.disable_doit_button();
        }
        return this.command.ready;
      }

      ready_to_perform() {
        var permit_multi_select;
        permit_multi_select = true;
        return (this.transient_verb_engaged === 'unselect') || (!this.object_phrase && (this.engaged_verbs.length > 0)) || (permit_multi_select && (this.engaged_verbs.length === 1 && this.engaged_verbs[0] === 'select'));
      }

      build_verb_form() {
        var i, len, ref, results, vset;
        this.verb_pretty_name = {};
        ref = this.verb_sets;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          vset = ref[i];
          results.push(this.add_verb_set(vset));
        }
        return results;
      }

      add_verb_set(vset) {
        var alternatives, id, label;
        alternatives = this.verbdiv.append('div').attr('class', 'alternates');
        for (id in vset) {
          label = vset[id];
          this.verb_pretty_name[id] = label;
          this.build_verb_picker(id, label, alternatives);
        }
        this.verb_pretty_name['load'] = this.huviz.human_term.load;
        this.verb_pretty_name['hunt'] = this.huviz.human_term.hunt;
        this.verb_pretty_name['draw'] = this.huviz.human_term.draw;
        this.verb_pretty_name['undraw'] = this.huviz.human_term.undraw;
        return alternatives;
      }

      get_verbs_overridden_by(verb_id) {
        var i, label, len, override, ref, vid, vset;
        override = this.verbs_override[verb_id] || [];
        ref = this.verb_sets;
        for (i = 0, len = ref.length; i < len; i++) {
          vset = ref[i];
          if (vset[verb_id]) {
            for (vid in vset) {
              label = vset[vid];
              if (!(indexOf.call(override, vid) >= 0) && verb_id !== vid) {
                override.push(vid);
              }
            }
          }
        }
        return override;
      }

      /*
      The "Do it" button is not needed if the following hold...

      If there is an object_phrase then the instant a verb is picked the command
      should run.

      If there are verbs picked then the instant there is an object_phrase the
      command should run and the object_phrase cleared. (what about selected_set?)

      Note that this covers immediate execution of transient verbs select/unselect

      */
      are_non_transient_verbs() {
        var len_transient;
        // return whether there are any non-transient verbs engaged
        len_transient = (this.transient_verb_engaged != null) && 1 || 0;
        return this.engaged_verbs.length > len_transient;
      }

      engage_transient_verb_if_needed(verb_id) {
        if (this.engaged_verbs.length === 0 && !this.are_non_transient_verbs()) {
          return this.engage_verb(verb_id, true);
        }
      }

      disengage_transient_verb_if_needed() {
        if (this.transient_verb_engaged) {
          this.disengage_verb(this.transient_verb_engaged);
          this.huviz.set_cursor_for_verbs(this.engaged_verbs);
          return this.update_command();
        }
      }

      engage_verb(verb_id, transient) {
        var i, len, overrides, ref, vid;
        if (transient) {
          this.transient_verb_engaged = verb_id;
          this.verb_control[verb_id].classed('transient', true);
        }
        overrides = this.get_verbs_overridden_by(verb_id);
        this.verb_control[verb_id].classed('engaged', true);
        ref = this.engaged_verbs;
        for (i = 0, len = ref.length; i < len; i++) {
          vid = ref[i];
          if (indexOf.call(overrides, vid) >= 0) {
            this.disengage_verb(vid);
          }
        }
        if (!(indexOf.call(this.engaged_verbs, verb_id) >= 0)) {
          return this.engaged_verbs.push(verb_id);
        }
      }

      disengage_verb(verb_id, transient) {
        this.engaged_verbs = this.engaged_verbs.filter(function(verb) {
          return verb !== verb_id; // remove verb_id
        });
        this.verb_control[verb_id].classed('engaged', false);
        if (verb_id === this.transient_verb_engaged) {
          this.transient_verb_engaged = false;
          return this.verb_control[verb_id].classed('transient', false);
        }
      }

      build_verb_picker(id, label, alternatives) {
        var that, vbctl;
        vbctl = alternatives.append('div').attr("class", "verb");
        if (this.verb_descriptions[id]) {
          vbctl.attr("title", this.verb_descriptions[id]);
        }
        vbctl.attr("id", "verb-" + id);
        this.verb_control[id] = vbctl;
        vbctl.text(label);
        that = this;
        vbctl.on('click', () => {
          return this.handle_on_verb_clicked(id, vbctl);
        });
        vbctl.on('mouseenter', function() { // tell user what will happen if this verb is clicked
          var because, click_would_engage, elem;
          elem = d3.select(this);
          click_would_engage = !elem.classed('engaged');
          because = {};
          if (click_would_engage) {
            that.proposed_verb = id; // not proposed_verbs because there can be at most one
            because = {
              proposed_verb: id // clicking would disengage the verb
            };
          } else {
            //cleanup: that.disengage_all_verbs
            that.proposed_verb = null; // TODO figure out whether and how to show user
          }
          // After the click there will be engaged verbs if click_would_engage
          // or there are more than one engaged_verbs.
          //click_would_leave_a_verb_phrase = click_would_engage or that.engaged_verbs.length > 1
          return that.update_command(because);
        });
        return vbctl.on('mouseleave', function() {
          var because, elem, leaving_verb_id;
          elem = d3.select(this);
          leaving_verb_id = elem.classed('engaged');
          because = {
            verb_leaving: leaving_verb_id
          };
          that.proposed_verb = null;
          return that.update_command(because);
        });
      }

      handle_on_verb_clicked(id, elem) {
        this.start_working();
        return setTimeout(() => { // run asynchronously so @start_working() can get a head start
          return this.on_verb_clicked(id, elem);
        });
      }

      on_verb_clicked(id, elem) {
        var because, newstate;
        newstate = !elem.classed('engaged');
        elem.classed('engaged', newstate);
        if (newstate) {
          this.engage_verb(id);
          if (id === "walk") {
            this.taxon_picker.shield();
            this.set_picker.shield();
          }
          this.proposed_verb = null; // there should be no proposed_verb if we are clicking engaging one
          because = {
            verb_added: id,
            cleanup: this.disengage_all_verbs
          };
        } else {
          if (id === "walk") {
            this.taxon_picker.unshield();
            this.set_picker.unshield();
          }
          this.disengage_verb(id);
        }
        if ((this.engaged_verbs == null) || this.engaged_verbs.length === 0) {
          this.huviz.set_cursor_for_verbs([]);
        }
        return this.update_command(because);
      }

      run_script(script) {
        // We recognize a couple of different visible "space-illustrating characters" as spaces.
        //   https://en.wikipedia.org/wiki/Whitespace_character
        //     U+237D  ⍽ SHOULDERED OPEN BOX
        //     U+2420  ␠  SYMBOL FOR SPACE
        // The purpose of recognizing these as spaces is to make the scripts using them
        // more readable in a URL, especially in a FormURLa.
        script = script.replace(/[\u237D\u2420]/g, " ");
        this.huviz.gclc.run(script);
        return this.huviz.update_all_counts();
      }

      build_set_picker(label, where) {
        // FIXME populate @the_sets from @huviz.selectable_sets
        where = (label != null) && this.control_label(label, where) || this.comdiv;
        this.the_sets = { // TODO build this automatically from huviz.selectable_sets
          'all_set': [
            this.huviz.all_set.label,
            {
              selected_set: [this.huviz.selected_set.label],
              chosen_set: [this.huviz.chosen_set.label],
              graphed_set: [this.huviz.graphed_set.label],
              shelved_set: [this.huviz.shelved_set.label],
              hidden_set: [this.huviz.hidden_set.label],
              discarded_set: [this.huviz.discarded_set.label],
              labelled_set: [this.huviz.labelled_set.label],
              pinned_set: [this.huviz.pinned_set.label],
              nameless_set: [this.huviz.nameless_set.label],
              walked_set: [this.huviz.walked_set.label]
            }
          ]
        };
        this.set_picker_box = where.append('div').classed('container', true).attr('id', 'sets');
        this.set_picker = new TreePicker(this.set_picker_box, 'all', ['treepicker-vertical']);
        this.set_picker.click_listener = this.handle_on_set_picked;
        this.set_picker.show_tree(this.the_sets, this.set_picker_box);
        this.populate_all_set_docs();
        this.make_sets_proposable();
        where.classed("set_picker_box_parent", true);
        return where;
      }

      populate_all_set_docs() {
        var a_set, id, ref, results;
        ref = this.huviz.selectable_sets;
        results = [];
        for (id in ref) {
          a_set = ref[id];
          if (a_set.docs != null) {
            results.push(this.set_picker.set_title(id, a_set.docs));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }

      make_sets_proposable() {
        var a_set, id, make_listeners, ref, results;
        make_listeners = (id, a_set) => { // fat arrow carries this to @
          var set_ctl;
          set_ctl = this.set_picker.id_to_elem[id];
          set_ctl.on('mouseenter', () => {
            this.proposed_set = a_set;
            return this.update_command();
          });
          return set_ctl.on('mouseleave', () => {
            this.proposed_set = null;
            return this.update_command();
          });
        };
        ref = this.huviz.selectable_sets;
        results = [];
        for (id in ref) {
          a_set = ref[id];
          results.push(make_listeners(id, a_set));
        }
        return results;
      }

      handle_on_set_picked(set_id, new_state) {
        this.start_working();
        return setTimeout(() => { // run asynchronously so @start_working() can get a head start
          return this.on_set_picked(set_id, new_state);
        });
      }

      on_set_picked(set_id, new_state) {
        var XXXcmd, because, cmd, hasVerbs;
        this.clear_set_picker(); // TODO consider in relation to liking_all_mode
        this.set_picker.set_direct_state(set_id, new_state);
        because = {};
        hasVerbs = !!this.engaged_verbs.length;
        if (new_state === 'showing') {
          this.taxon_picker.shield();
          this.chosen_set = this.huviz[set_id];
          this.chosen_set_id = set_id;
          because = {
            set_added: set_id,
            cleanup: this.disengage_all_sets // the method to call to clear
          };
          if (hasVerbs) {
            cmd = new gcl.GraphCommand(this.huviz, {
              verbs: this.engaged_verbs, // ['select']
              sets: [this.chosen_set.id]
            });
          }
        } else if (new_state === 'unshowing') {
          this.taxon_picker.unshield();
          XXXcmd = new gcl.GraphCommand(this.huviz, {
            verbs: ['unselect'],
            sets: [this.chosen_set.id]
          });
          this.disengage_all_sets();
        }
        if (cmd != null) {
          this.huviz.run_command(cmd, this.make_run_transient_and_cleanup_callback(because));
          because = {};
        }
        return this.update_command();
      }

      disengage_all_sets() {
        // TODO harmonize disengage_all_sets() and clear_all_sets() or document difference
        if (this.chosen_set_id) {
          this.on_set_picked(this.chosen_set_id, "unshowing");
          delete this.chosen_set_id;
          return delete this.chosen_set;
        }
      }

      clear_all_sets() {
        var cleanup_verb, cmd, ref, set_key, set_label, skip_sets, the_set;
        skip_sets = ['shelved_set'];
        ref = this.the_sets.all_set[1];
        for (set_key in ref) {
          set_label = ref[set_key];
          if (indexOf.call(skip_sets, set_key) >= 0) {
            continue;
          }
          the_set = this.huviz[set_key];
          cleanup_verb = the_set.cleanup_verb;
          cmd = new gcl.GraphCommand(this.huviz, {
            verbs: [cleanup_verb],
            sets: [the_set.id]
          });
          this.huviz.run_command(cmd);
        }
      }

      on_set_count_update(set_id, count) {
        return this.set_picker.set_payload(set_id, count);
      }

      on_taxon_count_update(taxon_id, count) {
        return this.taxon_picker.set_payload(taxon_id, count);
      }

      on_predicate_count_update(pred_lid, count) {
        return this.predicate_picker.set_payload(pred_lid, count);
      }

      clear_set_picker() {
        if (this.chosen_set_id != null) {
          this.set_picker.set_direct_state(this.chosen_set_id, 'unshowing');
          return delete this.chosen_set_id;
        }
      }

    };

    //,
    //  print: 'print'
    //  redact: 'redact'
    //  peek: 'peek'
    //,  # FIXME the edge related commands must be reviewed
    //  show: 'reveal'
    //  suppress: 'suppress'
    //  specify: 'specify'
    //emphasize: 'emphasize'
    CommandController.prototype.auto_change_verb_tests = {
      select: function(node) {
        if (node.selected != null) {
          return 'unselect';
        }
      },
      unselect: function(node) {
        if (node.selected == null) {
          return 'select';
        }
      },
      choose: function(node) {
        if (node.chosen != null) {
          return 'unchoose';
        }
      },
      unchoose: function(node, engagedVerb) {
        if (node.chosen == null) {
          return 'choose' || engagedVerb;
        }
      },
      wander: function(node) {
        if (node.chosen != null) {
          return 'wander';
        }
      },
      walk: function(node) {
        if (node.chosen != null) {
          return 'walk';
        }
      },
      label: function(node) {
        if (node.labelled) {
          return 'unlabel';
        }
      },
      unlabel: function(node) {
        if (!node.labelled) {
          return 'label';
        }
      },
      unpin: function(node) {
        if (!node.fixed) {
          return 'pin';
        }
      },
      pin: function(node) {
        if (node.fixed) {
          return 'unpin';
        }
      }
    };

    CommandController.prototype.verbs_requiring_regarding = ['show', 'suppress', 'emphasize', 'deemphasize'];

    CommandController.prototype.verbs_override = {
      choose: ['discard', 'unchoose', 'shelve', 'hide', 'wander', 'walk'],
      wander: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'walk'],
      walk: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'wander'],
      shelve: ['unchoose', 'choose', 'hide', 'discard', 'retrieve', 'wander', 'walk'],
      discard: ['choose', 'retrieve', 'hide', 'unchoose', 'unselect', 'select', 'wander', 'walk'],
      hide: ['discard', 'undiscard', 'label', 'choose', 'unchoose', 'select', 'unselect', 'wander', 'walk'],
      hunt: ['discard', 'undiscard', 'choose', 'unchoose', 'wander', 'walk', 'hide', 'unhide', 'shelve', 'pin', 'unpin']
    };

    CommandController.prototype.verb_descriptions = {
      choose: "Put nodes in the graph and pull other, connected nodes in too, so long as they haven't been discarded.",
      wander: "Put nodes in the graph and pull connected nodes in followed by shelving of the nodes which had been pulled into the graph previously.",
      walk: "Put nodes in the graph but keep the previous central nodes activated. Shelve previous sub-nodes.",
      shelve: "Remove nodes from the graph and put them on the shelf (the circle of nodes around the graph) from which they might return if called back into the graph by a neighbor being chosen.",
      hide: "Remove nodes from the graph and don't display them anywhere, though they might be called back into the graph when some other node calls it back in to show an edge.",
      label: "Show the node's labels.",
      unlabel: "Stop showing the node's labels.",
      discard: "Put nodes in the discard bin (the small red circle which appears when you start dragging a node) from which they do not get called back into the graph unless they are first retrieved.",
      undiscard: "Retrieve nodes from the discard bin (the small red circle which appears when you start dragging a node)) and put them back on the shelf.",
      print: "Print associated snippets.",
      redact: "Hide the associated snippets.",
      show: "Show edges: 'Show (nodes) regarding (edges).' Add to the existing state of the graph edges from nodes of the classes indicated edges of the types indicated.",
      suppress: "Stop showing: 'Suppress (nodes) regarding (edges).' Remove from the existing sate of the graph edges of the types indicated from nodes of the types classes indicated.",
      specify: "Immediately specify the entire state of the graph with the constantly updating set of edges indicated from nodes of the classes indicated.",
      load: "Load knowledge from the given uri.",
      pin: "Make a node immobile",
      unpin: "Make a node mobile again",
      hunt: "Animate binary search for the node"
    };

    CommandController.prototype.verb_cursors = {
      choose: "←",
      unchoose: "⇠",
      wander: "🚶",
      walk: "🚶",
      shelve: "↺",
      label: "☭",
      unlabel: "☢",
      discard: "☣",
      undiscard: "☯",
      hide: "☠",
      select: "☘",
      unselect: "☺",
      pin: "p",
      unpin: "u",
      hunt: "X"
    };

    CommandController.prototype.working_timeout = 500; // msec

    CommandController.prototype.nextcommand_prompts_visible = true;

    CommandController.prototype.nextcommand_str_visible = false;

    CommandController.prototype.engaged_verbs = [];

    CommandController.prototype.verb_control = {};

    return CommandController;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).CommandController = CommandController;

}).call(this);

(function() {
  var GCLTest, GCLTestSuite, GraphCommand, GraphCommandLanguageCtrl, angliciser;

  angliciser = require('angliciser').angliciser;

  //gvcl = require('gvcl') #.GVCL
  GCLTest = class GCLTest {
    constructor(runner, spec1) {
      this.runner = runner;
      this.spec = spec1;
      console.log("GCLTest", this);
    }

    perform() {
      var e, exp, expected, got, i, len, msg, ref, ref1;
      if (this.spec.script) {
        //console.log "==================",@spec.script
        this.runner.gclc.run(this.spec.script);
      }
      ref1 = (ref = this.spec.expectations) != null ? ref : [];
      // should the expections be checked in a callback?
      for (i = 0, len = ref1.length; i < len; i++) {
        exp = ref1[i];
        console.log("exp", exp);
        try {
          got = eval(exp[0]);
        } catch (error) {
          e = error;
          throw new Error("while eval('" + exp[0] + "') caught: " + e);
        }
        expected = exp[1];
        if (this.runner.verbose) {
          console.log("got=" + got + " expected:" + expected);
        }
        if (got !== expected) {
          msg = msg != null ? msg : "'" + this.spec.desc + "' " + exp[0] + " = " + got + " not " + expected;
          return msg;
        }
      }
    }

  };

  GCLTestSuite = class GCLTestSuite {
    /*
     * callback = function(){
     *    this.expect(this.graph_ctrl.nodes.length,7);
     *    this.expect(this.graph_ctrl.shelved_set.length,0);
     * }
     * ts = new GCLTestSuite(gclc, [
     *      {script:"choose 'abdyma'",
     *       expectations: [
     *           ["this.graph_ctrl.nodes.length",7],
     *           ["this.graph_ctrl.shelved_set.length",0],
     *       ]
     *      }
     *     ])
     */
    constructor(huviz, suite) {
      this.huviz = huviz;
      this.suite = suite;
      console.log("GCLTestSuite() arguments", arguments);
      this.break_quickly = true;
    }

    emit(txt, id) {
      return $("#testsuite-results").append("div").attr("id", id).text(txt);
    }

    run() {
      var e, err, errors, fail, fails, i, j, k, len, len1, len2, num, pass_count, passed, ref, results, retval, spec, test;
      pass_count = 0;
      errors = [];
      fails = [];
      num = 0;
      this.emit("RUNNING", "running");
      ref = this.suite;
      for (i = 0, len = ref.length; i < len; i++) {
        spec = ref[i];
        num++;
        passed = false;
        console.log("spec:", spec);
        test = new GCLTest(this, spec);
        try {
          retval = test.perform();
          if (this.verbose) {
            console.log(retval);
          }
          if (retval != null) {
            fails.push([num, retval]);
          } else {
            passed = true;
            pass_count++;
          }
        } catch (error) {
          e = error;
          errors.push([num, e]);
        }
        //throw e
        if (!passed && this.break_quickly) {
          break;
        }
      }
      console.log("passed:" + pass_count + " failed:" + fails.length, " errors:" + errors.length);
      for (j = 0, len1 = fails.length; j < len1; j++) {
        fail = fails[j];
        console.log("test#" + fail[0], fail[1]);
      }
      results = [];
      for (k = 0, len2 = errors.length; k < len2; k++) {
        err = errors[k];
        results.push(console.log("err#" + err[0], err[1]));
      }
      return results;
    }

  };

  GraphCommand = (function() {
    class GraphCommand {
      // "choose,label 'abdyma'"
      // "label Thing"
      // "choose matching 'Maria'"
      // "choose organizations matching 'church'"
      // "choose Thing matching 'mary'"
      // "discard organizations matching 'mary'"
      // "choose writers matching 'Margaret' regarding family"
      //    /(\w+)(,\s*\w+) '(\w+)'/

      // Expect args: verbs, subjects, classes, constraints, regarding
      //   verbs: a list of verb names eg: ['choose','label'] REQUIRED
      //   subjects: a list of subj_ids eg: ['_:AE','http://a.com/abdyma']
      //   classes: a list of classes: ['writers','orgs']
      //   sets: a list of the huviz sets to act on eg: [@huviz.graphed_set]
      //   constraints: matching TODO(smurp) document GraphCommand constraints
      //   regarding: a list of pred_ids eg: ['orl:child','orl:denom']
      //       really [ orl:connectionToOrganization,
      //                http://vocab.sindice.com/xfn#child ]
      // Every command must have at least one verb and any kind of subject, so
      //   at least one of: subjects, classes or sets
      // Optional parameters are:
      //   constraints and regarding
      constructor(huviz, args_or_str) {
        var argn, args, argv;
        this.huviz = huviz;
        if (args_or_str instanceof GraphCommand) {
          throw new Error("nested GraphCommand no longer permitted");
        }
        this.prefixes = {};
        this.args_or_str = args_or_str;
        if (typeof args_or_str === 'string') {
          args = this.parse(args_or_str);
        } else {
          args = args_or_str;
        }
        if (args.skip_history == null) {
          args.skip_history = false;
        }
        if (args.every_class == null) {
          args.every_class = false;
        }
        for (argn in args) {
          argv = args[argn];
          this[argn] = argv;
        }
        if (this.str == null) {
          this.update_str();
        }
      }

      get_node(node_spec) {
        var abbr, id, id_parts, msg, node, prefix, ref, term, tried;
        // REVIEW this method needs attention
        if (node_spec.id) {
          node = this.huviz.nodes.get({
            'id': node_spec.id
          });
        }
        if (node) {
          return node;
        }
        tried = [node_spec];
        id_parts = node_spec.split(':'); // REVIEW curie? uri?
        if (id_parts.length > 1) {
          abbr = id_parts[0];
          id = id_parts[1];
          prefix = this.prefixes[abbr];
          if (prefix) {
            term = prefix + id;
            node = this.huviz.nodes.get({
              'id': term
            });
            tried.push(term);
          }
        }
        if (!node) {
          ref = this.prefixes;
          for (abbr in ref) {
            prefix = ref[abbr];
            if (!node) {
              term = prefix + id;
              tried.push(term);
              node = this.huviz.nodes.get({
                'id': term
              });
            }
          }
        }
        if (!node) {
          msg = `node with id = ${term} not found among ${this.huviz.nodes.length} nodes: ${tried}`;
          console.warn(msg);
          throw new Error(msg);
        }
        return node;
      }

      get_nodes() {
        var a_set, a_set_id, class_name, i, j, k, len, len1, len2, len3, len4, len5, like_regex, m, n, node, node_spec, o, p, ref, ref1, ref2, ref3, result_set, set, the_set;
        result_set = SortedSet().sort_on("id");
        like_regex = null;
        if (this.like) {
          like_regex = new RegExp(this.like, "ig"); // ignore, greedy
        }
        if (this.subjects) {
          ref = this.subjects;
          for (i = 0, len = ref.length; i < len; i++) {
            node_spec = ref[i];
            node = this.get_node(node_spec);
            if (node) {
              if ((like_regex == null) || node.name.match(like_regex)) {
                result_set.add(node);
              }
            } else {
              if (this.classes == null) {
                this.classes = [];
              }
              this.classes.push(node_spec.id); // very hacky
            }
          }
        }
        //nodes.push(node)
        if (this.classes) {
          ref1 = this.classes;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            class_name = ref1[j];
            the_set = (ref2 = this.huviz.taxonomy[class_name]) != null ? ref2.get_instances() : void 0;
            if (the_set != null) {
              if (like_regex) {
                for (k = 0, len2 = the_set.length; k < len2; k++) {
                  n = the_set[k];
                  if (n.name.match(like_regex)) {
                    result_set.add(n); // a redundant loop, kept shallow for speed when no like
                  }
                }
              } else {
                for (m = 0, len3 = the_set.length; m < len3; m++) {
                  n = the_set[m];
                  result_set.add(n);
                }
              }
            }
          }
        }
        if (this.sets) {
          ref3 = this.sets;
          // set might be a SortedSet instance or a_set_id string
          for (o = 0, len4 = ref3.length; o < len4; o++) {
            set = ref3[o];
            if (typeof set === 'string') {
              a_set_id = set;
              a_set = this.huviz.get_set_by_id(a_set_id);
            } else {
              a_set = set;
            }
            for (p = 0, len5 = a_set.length; p < len5; p++) {
              node = a_set[p];
              if ((like_regex == null) || node.name.match(like_regex)) {
                result_set.add(node);
              }
            }
          }
        }
        return result_set;
      }

      get_methods() {
        var i, len, method, methods, msg, ref, verb;
        methods = [];
        ref = this.verbs;
        for (i = 0, len = ref.length; i < len; i++) {
          verb = ref[i];
          method = this.huviz[verb];
          if (method) {
            method.build_callback = this.huviz[`${verb}__build_callback`];
            method.callback = this.huviz[`${verb}__atLast`];
            method.atFirst = this.huviz[`${verb}__atFirst`];
            methods.push(method);
          } else {
            msg = "method '" + verb + "' not found";
            console.error(msg);
          }
        }
        return methods;
      }

      get_predicate_methods() {
        var i, len, method, methods, msg, ref, verb;
        methods = [];
        ref = this.verbs;
        for (i = 0, len = ref.length; i < len; i++) {
          verb = ref[i];
          method = this.huviz[verb + "_edge_regarding"];
          if (method) {
            methods.push(method);
          } else {
            msg = "method '" + verb + "' not found";
            console.error(msg);
          }
        }
        return methods;
      }

      regarding_required() {
        return (this.regarding != null) && this.regarding.length > 0;
      }

      execute() {
        var USE_ASYNC, atFirst, callback, errorHandler, i, iter, j, k, len, len1, len2, meth, node, nodes, ref, ref1, regarding_required;
        this.huviz.show_state_msg(this.as_msg());
        this.huviz.force.stop();
        regarding_required = this.regarding_required();
        nodes = this.get_nodes();
        console.log(`%c${this.str}`, "color:blue;font-size:1.5em;", `on ${nodes.length} nodes`);
        errorHandler = function(err_arg) {
          //alert("WOOT! command has executed")
          if (err_arg != null) {
            console.error("err =", err_arg);
            if (err_arg == null) {
              throw "err_arg is null";
            }
            throw err_arg;
          }
        };
        //else
        //  console.log("DONE .execute()")
        if (regarding_required) {
          ref = this.get_predicate_methods();
          for (i = 0, len = ref.length; i < len; i++) {
            meth = ref[i];
            iter = (node) => {
              var j, len1, pred, ref1, retval;
              ref1 = this.regarding;
              for (j = 0, len1 = ref1.length; j < len1; j++) {
                pred = ref1[j];
                retval = meth.call(this.huviz, node, pred);
              }
              return this.huviz.tick();
            };
            if (nodes != null) {
              async.each(nodes, iter, errorHandler);
            }
          }
        } else if (this.verbs[0] === 'load') { // FIXME not very general, but it appears to be the sole exception
          this.huviz.load_with(this.data_uri, this.with_ontologies);
          console.log("load data_uri has returned");
        } else {
          ref1 = this.get_methods();
          // find the methods on huviz which implement each verb
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            meth = ref1[j];
            if (meth.callback) {
              callback = meth.callback;
            } else if (meth.build_callback) {
              callback = meth.build_callback(this, nodes);
            } else {
              callback = errorHandler;
            }
            atFirst = meth.atFirst;
            if (atFirst != null) {
              atFirst(); // is called once before iterating through the nodes
            }
            iter = (node) => {
              var retval;
              return retval = meth.call(this.huviz, node, this);
            };
            //@huviz.tick() # TODO(smurp) move this out, or call every Nth node
            // REVIEW Must we check for nodes? Perhaps atLast dominates.
            if (nodes != null) {
              if (USE_ASYNC = false) {
                async.each(nodes, iter, callback);
              } else {
                for (k = 0, len2 = nodes.length; k < len2; k++) {
                  node = nodes[k];
                  iter(node);
                }
                this.huviz.gclui.set;
                callback(); // atLast is called once, after the verb has been called on each node
              }
            }
          }
        }
        this.huviz.clean_up_all_dirt_once();
        this.huviz.hide_state_msg();
        this.huviz.force.start();
        this.huviz.tick("Tick in graphcommandlanguage");
      }

      get_pretty_verbs() {
        var i, l, len, ref, verb_id;
        l = [];
        ref = this.verbs;
        for (i = 0, len = ref.length; i < len; i++) {
          verb_id = ref[i];
          l.push(this.huviz.gclui.verb_pretty_name[verb_id]);
        }
        return l;
      }

      update_str() {
        var aSet, cmd_str, i, j, len, len1, like_str, maybe_every, missing, more, obj_phrase, ready, ref, ref1, regarding_phrase, regarding_required, set, setLabel, setLabels, subj, verb;
        missing = this.missing;
        cmd_str = "";
        ready = true;
        regarding_required = false;
        this.verb_phrase = '';
        this.noun_phrase = '';
        this.noun_phrase_ready = false;
        //@object_phrase = null
        if (this.verbs && this.verbs.length) {
          cmd_str = angliciser(this.get_pretty_verbs());
          this.verb_phrase_ready = true;
          this.verb_phrase = cmd_str;
        } else {
          ready = false;
          cmd_str = missing;
          this.verb_phrase_ready = false;
          this.verb_phrase = this.huviz.human_term.blank_verb;
        }
        this.verb_phrase += ' ';
        cmd_str += " ";
        obj_phrase = "";
        if (cmd_str === 'load ') {
          this.str += this.data_uri + " .";
          return;
        }
        //debugger if not @object_phrase?
        if (this.object_phrase == null) {
          this.object_phrase = null; // this gives @object_phrase a value even if it is null
        }
        if (this.sets != null) {
          setLabels = [];
          ref = this.sets;
          // either a list of SortedSets or their ids
          for (i = 0, len = ref.length; i < len; i++) {
            set = ref[i];
            if (typeof set === 'string') {
              aSet = this.huviz.get_set_by_id(set);
            } else {
              aSet = set;
            }
            setLabel = aSet.get_label();
            setLabels.push(setLabel);
          }
          more = angliciser(setLabels);
          more = `the ${more} set` + ((this.sets.length > 1) && 's' || '');
          this.object_phrase = more;
          //if @object_phrase?
          this.noun_phrase_ready = true;
          obj_phrase = this.object_phrase;
          this.noun_phrase = obj_phrase;
        } else {
          if (this.object_phrase) {
            console.log("update_str() object_phrase: ", this.object_phrase);
            obj_phrase = this.object_phrase;
          } else if (this.classes) {
            maybe_every = this.every_class && "every " || "";
            obj_phrase += maybe_every + angliciser(this.classes);
            if (this.except_subjects) {
              obj_phrase += ' except ' + angliciser((function() {
                var j, len1, ref1, results;
                ref1 = this.subjects;
                results = [];
                for (j = 0, len1 = ref1.length; j < len1; j++) {
                  subj = ref1[j];
                  results.push(subj.lid);
                }
                return results;
              }).call(this));
            }
          } else if (this.subjects) {
            obj_phrase = angliciser((function() {
              var j, len1, ref1, results;
              ref1 = this.subjects;
              results = [];
              for (j = 0, len1 = ref1.length; j < len1; j++) {
                subj = ref1[j];
                results.push(subj.lid || subj);
              }
              return results;
            }).call(this));
          }
        }
        //@noun_phrase = obj_phrase
        if (obj_phrase === "") {
          obj_phrase = missing;
          ready = false;
          this.noun_phrase_ready = false;
          this.noun_phrase = this.huviz.human_term.blank_noun;
        } else if (obj_phrase.length > 0) {
          this.noun_phrase_ready = true;
          this.noun_phrase = obj_phrase;
        }
        cmd_str += obj_phrase;
        like_str = (this.like || "").trim();
        if (this.verbs) {
          ref1 = this.verbs;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            verb = ref1[j];
            if (['draw', 'undraw'].indexOf(verb) > -1) {
              regarding_required = true;
            }
          }
        }
        if (regarding_required) {
          regarding_phrase = missing;
          if (this.regarding_required()) { //? and @regarding.length > 0
            regarding_phrase = angliciser(this.regarding);
            if (this.regarding_every) {
              regarding_phrase = "every " + regarding_phrase;
            }
          } else {
            ready = false;
          }
        }
        this.suffix_phrase = '';
        if (like_str) {
          this.suffix_phrase += " matching '" + like_str + "'";
        }
        if (regarding_phrase) {
          this.suffix_phrase += " regarding " + regarding_phrase + ' .';
        } else if (this.polar_coords) {
          this.suffix_phrase += ` at ${this.polar_coords.degrees.toFixed(0)} degrees`;
          this.suffix_phrase += ` and range ${this.polar_coords.range.toFixed(2)} .`;
        } else {
          this.suffix_phrase += ' .';
        }
        cmd_str += this.suffix_phrase;
        //cmd_str += " ."
        this.ready = ready;
        return this.str = cmd_str;
      }

      toString() {
        return this.str;
      }

      parse(cmd_str) {
        var cmd, parts, subj, verb;
        parts = cmd_str.split(" ");
        verb = parts[0];
        cmd = {};
        cmd.verbs = [verb];
        if (verb === 'load') {
          cmd.data_uri = parts[1];
          if (parts.length > 3) {
            // "load /data/bob.ttl with onto1.ttl onto2.ttl"
            cmd.with_ontologies = parts.slice(3); // cdr
          }
        } else {
          subj = parts[1].replace(/\'/g, "");
          cmd.subjects = [
            {
              'id': subj
            }
          ];
        }
        return cmd;
      }

      toString() {
        return this.str;
      }

      as_msg() {
        return this.str;
      }

    };

    GraphCommand.prototype.missing = '____';

    return GraphCommand;

  }).call(this);

  GraphCommandLanguageCtrl = class GraphCommandLanguageCtrl {
    constructor(huviz) {
      this.execute = this.execute.bind(this);
      this.huviz = huviz;
      this.prefixes = {};
    }

    run(script, callback) {
      var retval;
      this.huviz.before_running_command(this);
      //console.debug("script: ",script)
      if (script == null) {
        console.error("script must be defined");
        return;
      }
      if (script instanceof GraphCommand) {
        this.commands = [script];
      } else if (typeof script === 'string') {
        this.commands = script.split(';');
      //@gvcl_script = new GVCL(script)
      } else if (script.constructor === [].constructor) {
        this.commands = script; // an object we presume
      } else {
        this.commands = [script];
      }
      retval = this.execute(callback);
      //console.log "commands:"
      //console.log @commands
      this.huviz.after_running_command(this);
      return retval;
    }

    run_one(cmd_spec) {
      var cmd;
      if (cmd_spec instanceof GraphCommand) {
        cmd = cmd_spec;
      } else {
        cmd = new GraphCommand(this.huviz, cmd_spec);
      }
      cmd.prefixes = this.prefixes;
      return cmd.execute();
    }

    execute(callback) {
      var cmd_spec, i, len, ref, run_once;
      if (this.commands.length > 0 && typeof this.commands[0] === 'string' && this.commands[0].match(/^load /)) {
        //console.log("initial execute", @commands)
        this.run_one(this.commands.shift());
        //setTimeout @execute, 2000
        run_once = () => {
          document.removeEventListener('dataset-loaded', run_once);
          return this.execute();
        };
        document.addEventListener('dataset-loaded', run_once);
        return;
      }
      ref = this.commands;
      for (i = 0, len = ref.length; i < len; i++) {
        cmd_spec = ref[i];
        if (cmd_spec) { // ie not blank
          this.run_one(cmd_spec);
        }
      }
      if (callback != null) {
        callback();
      }
    }

  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).GraphCommandLanguageCtrl = GraphCommandLanguageCtrl;

  (typeof exports !== "undefined" && exports !== null ? exports : this).GraphCommand = GraphCommand;

  (typeof exports !== "undefined" && exports !== null ? exports : this).GCLTest = GCLTest;

  (typeof exports !== "undefined" && exports !== null ? exports : this).GCLTestSuite = GCLTestSuite;

}).call(this);

(function() {
  //GreenTurtle = GreenTurtle or require("green_turtle").GreenTurtle
  var GreenerTurtle;

  GreenerTurtle = (function() {
    var RDF_object, build_indices, count_subjects, get_incoming_predicates, obj_has_type, verbosity;

    class GreenerTurtle {
      parse(data, type) {
        var G;
        G = GreenTurtle.implementation.parse(data, type);
        if (!G.oid_2_id_p) {
          G.oid_2_id_p = {};
        }
        build_indices(G);
        count_subjects(G);
        G.get_incoming_predicates = get_incoming_predicates;
        return G;
      }

    };

    verbosity = false;

    obj_has_type = function(obj, typ) {
      return obj.type === typ;
    };

    RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

    build_indices = function(graph) {
      var obj, oi, p, predicate, results, subj, subj_id;
//console.log("SUBJ",graph.subjects);
      results = [];
      for (subj_id in graph.subjects) {
        subj = graph.subjects[subj_id];
        results.push((function() {
          var results1;

//console.log('  s =',subj,subj.predicates);
          results1 = [];
          for (p in subj.predicates) {
            predicate = subj.predicates[p];
            
            //console.log('    p =',predicate.objects.length,p);
            oi = 0;
            results1.push((function() {
              var results2;
              results2 = [];
              while (oi < predicate.objects.length) {
                obj = predicate.objects[oi];
                
                //console.log(obj);
                if (obj && obj_has_type(obj, RDF_object)) {
                  if (typeof graph.oid_2_id_p[obj.value] === "undefined") {
                    graph.oid_2_id_p[obj.value] = [];
                  }
                  if (obj.value === "_:E" && verbosity) {
                    console.log(obj.value, "----> [", subj.id, p, "]");
                  }
                  graph.oid_2_id_p[obj.value].push([subj.id, p]);
                }
                results2.push(oi++);
              }
              return results2;
            })());
          }
          return results1;
        })());
      }
      return results;
    };

    get_incoming_predicates = function(subj) {
      var resp;
      resp = this.oid_2_id_p[subj.id] || [];
      
      //console.log("get_incoming_predicates(",subj.id,")  ===>",resp);
      return resp;
    };

    count_subjects = function(graph) {
      var results, s;
      graph.num_subj = 0;
      results = [];
      for (s in graph.subjects) {
        results.push(graph.num_subj++);
      }
      return results;
    };

    return GreenerTurtle;

  }).call(this);

  exports.GreenerTurtle = GreenerTurtle;

}).call(this);

(function() {
  //See for inspiration:
  //  Collapsible Force Layout
  //    http://bl.ocks.org/mbostock/1093130
  //  Force-based label placement
  //    http://bl.ocks.org/MoritzStefaner/1377729
  //  Graph with labeled edges:
  //    http://bl.ocks.org/jhb/5955887
  //  Multi-Focus Layout:
  //    http://bl.ocks.org/mbostock/1021953
  //  Edge Labels
  //    http://bl.ocks.org/jhb/5955887

  //  Shelf -- around the graph, the ring of nodes which serves as reorderable menu
  //  Discard Bin -- a jail to contain nodes one does not want to be bothered by

  //  Commands on nodes
  //     choose/shelve     -- graph or remove from graph
  //     choose - add to graph and show all edges
  //     unchoose - hide all edges except those to 'chosen' nodes
  //                this will shelve (or hide if previously hidden)
  //                those nodes which end up no longer being connected
  //                to anything
  //     discard/retrieve    -- throw away or recover
  //     label/unlabel       -- shows labels or hides them
  //     substantiate/redact -- shows source text or hides it
  //     expand/contract     -- show all links or collapse them

  // TODO(smurp) implement emphasize and deemphasize 'verbs' (we need a new word)
  //   emphasize: (node,predicate,color) =>
  //   deemphasize: (node,predicate,color) =>
  //   pin/unpin

  // TODO(smurp) break out verbs as instances of class Verb, support loading of verbs

  // TODO: perhaps there is a distinction to be made between verbs
  //   and 'actuators' where verbs are the things that people issue
  //   while actuators (actions?) are the one-or-more things per-verb that
  //   constitute the implementation of the verb.  The motivations are:
  //     a) that actuators may be shared between verbs
  //     b) multiple actuators might be needed per verb
  //     c) there might be applications for actuators other than verbs
  //     d) there might be update operations against gclui apart from actuators

  // Immediate Priorities:
  // 120) BUG: hidden nodes are hidden but are also detectable via TextCursor
  // 118) TASK: add setting for "'chosen' border thickness (px)"
  // 116) BUG: stop truncating verbs lists longer than 2 in TextCursor: use grid
  // 115) TASK: add ColorTreepicker [+] and [-] boxes for 'show' and 'unshow'
  // 114) TASK: make text_cursor show detailed stuff when in Commands and Settings
  // 113) TASK: why is CP "Poetry" in abdyma.nq not shelved?
  // 107) TASK: minimize hits on TextCursor by only calling it when verbs change
  //            not whenever @focused_node changes
  // 104) TASK: remove no-longer-needed text_cursor calls
  //  40) TASK: support search better, show matches continuously
  //  79) TASK: support dragging of edges to shelf or discard bin
  //  97) TASK: integrate blanket for code coverage http://goo.gl/tH4Ghk
  //  93) BUG: toggling a predicate should toggle indirect-mixed on its supers
  //  92) BUG: non-empty predicates should not have payload '0/0' after kid click
  //  94) TASK: show_msg() during command.run to inform user and prevent clicks
  //  95) TASK: get /orlonto.html working smoothly again
  //  90) BUG: english is no longer minimal
  //  91) BUG: mocha async being misused re done(), so the passes count is wrong
  //  86) BUG: try_to_set_node_type: only permit subtypes to override supertypes
  //  87) BUG: solve node.type vs node.taxon sync problem (see orlonto)
  //  46) TASK: impute node type based on predicates via ontology DONE???
  //  53) PERF: should_show_label should not have search_regex in inner loop
  //  65) BUG: hidden nodes are not fully ignored on the shelf so shelved nodes
  //           are not always the focused node
  //  68) TASK: optimize update_english
  //  69) TASK: figure out ideal root for predicate hierarchy -- owl:Property?
  //  70) TASK: make owl:Thing implicit root class
  //            ie: have Taxons be subClassOf owl:Thing unless replaced
  //  72) TASK: consolidate type and taxon links from node?
  //  74) TASK: recover from loading crashes with Cancel button on show_state_msg
  //  76) TASK: consider renaming graphed_set to connected_set and verbs
  //            choose/unchoose to graph/ungraph
  //  84) TASK: add an unchosen_set containing the graphed but not chosen nodes

  // Eventual Tasks:
  //  85) TASK: move SVG, Canvas and WebGL renderers to own pluggable Renderer subclasses
  //  75) TASK: implement real script parser
  //   4) TASK: Suppress all but the 6-letter id of writers in the cmd cli
  //  14) TASK: it takes time for clicks on the predicate picker to finish;
  //      showing a busy cursor or a special state for the selected div
  //      would help the user have faith.
  //      (Investigate possible inefficiencies, too.)
  //      AKA: fix bad-layout-until-drag-and-drop bug
  //  18) TASK: drop a node on another node to draw their mutual edges only
  //  19) TASK: progressive documentation (context sensitive tips and intros)
  //  25) TASK: debug wait cursor when slow operations are happening, maybe
  //      prevent starting operations when slow stuff is underway
  //      AKA: show waiting cursor during verb execution
  //  30) TASK: Stop passing (node, change, old_node_status, new_node_status) to
  //      Taxon.update_state() because it never seems to be needed
  //  35) TASK: get rid of jquery
  //  37) TASK: fix Bronte names, ie unicode
  //  41) TASK: link to new backend
  //  51) TASK: make predicate picker height adjustable
  //  55) TASK: clicking an edge for a snippet already shown should add that
  //            triple line to the snippet box and bring the box forward
  //            (ideally using css animation to flash the triple and scroll to it)
  //  56) TASK: improve layout of the snippet box so the subj is on the first line
  //            and subsequent lines show (indented) predicate-object pairs for
  //            each triple which cites the snippet
  //  57) TASK: hover over node on shelf shows edges to graphed and shelved nodes
  //  61) TASK: make a settings controller for edge label (em) (or mag?)
  //  66) BUG: #load+/data/ballrm.nq fails to populate the predicate picker
  //  67) TASK: add verbs pin/unpin (using polar coords to record placement)

  var BASE10, BASE57, CommandController, DC_subject, DragAndDropLoader, DragAndDropLoaderOfScripts, Edge, EditController, FOAF_Group, FOAF_Person, FOAF_name, GeoUserNameWidget, GraphCommandLanguageCtrl, GreenerTurtle, Huviz, IndexedDBService, IndexedDBStorageController, MANY_SPACES_REGEX, NAME_SYNS, Node, OWL_Class, OWL_ObjectProperty, OWL_Thing, OntoViz, OntologicallyGrounded, Orlando, PEEKING_COLOR, PRIMORDIAL_ONTOLOGY, PickOrProvide, PickOrProvideScript, Predicate, RDFS_label, RDF_Class, RDF_a, RDF_literal, RDF_object, RDF_subClassOf, RDF_type, SKOS_prefLabel, SettingsWidget, Socrata, THUMB_PREDS, TYPE_SYNS, Taxon, TextCursor, UNDEFINED, UsernameWidget, XL_literalForm, XML_TAG_REGEX, angliciser, colorlog, convert, default_node_radius_policy, dist_lt, distance, escapeHtml, gcl, getPrefixedTypeSignature, getTypeSignature, has_predicate_value, has_type, hash, hpad, id_escape, ident, ids_to_show, int_to_base, is_a_main_node, is_node_to_always_show, is_one_of, linearize, node_radius_policies, orlando_human_term, sel_to_id, start_with_http, synthIdFor, tau, themeStyles, typeSigRE, unescape_unicode, unique_id, uniquer, unpad_md, wpad,
    indexOf = [].indexOf,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  angliciser = require('angliciser').angliciser;

  uniquer = require("uniquer").uniquer; // FIXME rename to make_dom_safe_id

  gcl = require('graphcommandlanguage');

  //asyncLoop = require('asynchronizer').asyncLoop
  CommandController = require('gclui').CommandController;

  EditController = require('editui').EditController;

  //FiniteStateMachine = require('fsm').FiniteStateMachine
  IndexedDBService = require('indexeddbservice').IndexedDBService;

  IndexedDBStorageController = require('indexeddbstoragecontroller').IndexedDBStorageController;

  Edge = require('edge').Edge;

  GraphCommandLanguageCtrl = require('graphcommandlanguage').GraphCommandLanguageCtrl;

  GreenerTurtle = require('greenerturtle').GreenerTurtle;

  Node = require('node').Node;

  Predicate = require('predicate').Predicate;

  Taxon = require('taxon').Taxon;

  TextCursor = require('textcursor').TextCursor;

  MultiString.set_langpath('en:fr'); // TODO make this a setting

  
  // It is as if these imports were happening but they are being stitched in instead
  //   OnceRunner = require('oncerunner').OnceRunner
  //   TODO document the other examples of requires that are being "stitched in"
  colorlog = function(msg, color, size) {
    if (color == null) {
      color = "red";
    }
    if (size == null) {
      size = "1.2em";
    }
    return console.log(`%c${msg}`, `color:${color};font-size:${size};`);
  };

  unpad_md = function(txt, pad) {
    var in_lines, j, len1, line, out, out_lines;
    // Purpose:
    //   Remove padding at the beginings of all lines in txt IFF all lines have padding
    // Motivation:
    //   Markdown is very whitespace sensitive but it makes for ugly code
    //   to not have left padding in large strings.
    pad = "    ";
    out_lines = [];
    in_lines = txt.split("\n");
    for (j = 0, len1 = in_lines.length; j < len1; j++) {
      line = in_lines[j];
      if (!(line.startsWith(pad) || line.length === 0)) {
        return txt;
      }
      out_lines.push(line.replace(/^    /, ''));
    }
    out = out_lines.join("\n");
    return out;
  };

  wpad = void 0;

  hpad = 10;

  tau = Math.PI * 2;

  distance = function(p1, p2) {
    var x, y;
    p2 = p2 || [0, 0];
    x = (p1.x || p1[0]) - (p2.x || p2[0]);
    y = (p1.y || p1[1]) - (p2.y || p2[1]);
    return Math.sqrt(x * x + y * y);
  };

  dist_lt = function(mouse, d, thresh) {
    var x, y;
    x = mouse[0] - d.x;
    y = mouse[1] - d.y;
    return Math.sqrt(x * x + y * y) < thresh;
  };

  hash = function(str) {
    var hsh, i;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    hsh = 5381;
    i = str.length;
    while (i) {
      hsh = (hsh * 33) ^ str.charCodeAt(--i);
    }
    return hsh >>> 0;
  };

  convert = function(src, srctable, desttable) {
    var destlen, i, numlen, q, r, res, srclen, val;
    // convert.js
    // http://rot47.net
    // Dr Zhihua Lai
    srclen = srctable.length;
    destlen = desttable.length;
    // first convert to base 10
    val = 0;
    numlen = src.length;
    i = 0;
    while (i < numlen) {
      val = val * srclen + srctable.indexOf(src.charAt(i));
      i++;
    }
    if (val < 0) {
      return 0;
    }
    // then covert to any base
    r = val % destlen;
    res = desttable.charAt(r);
    q = Math.floor(val / destlen);
    while (q) {
      r = q % destlen;
      q = Math.floor(q / destlen);
      res = desttable.charAt(r) + res;
    }
    return res;
  };

  BASE57 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  BASE10 = "0123456789";

  int_to_base = function(intgr) {
    return convert("" + intgr, BASE10, BASE57);
  };

  synthIdFor = function(str) {
    // return a short random hash suitable for use as DOM/JS id
    return 'h' + int_to_base(hash(str)).substr(0, 6);
  };

  window.synthIdFor = synthIdFor;

  unescape_unicode = function(u) {
    // pre-escape any existing quotes so when JSON.parse does not get confused
    return JSON.parse('"' + u.replace('"', '\\"') + '"');
  };

  linearize = function(msgRecipient, streamoid) {
    var i, l, line, recurse;
    if (streamoid.idx === 0) {
      return msgRecipient.postMessage({
        event: 'finish'
      });
    } else {
      i = streamoid.idx + 1;
      l = 0;
      while (streamoid.data[i](!'\n')) {
        l++;
        i++;
      }
      line = streamoid.data.substr(streamoid.idx, l + 1).trim();
      msgRecipient.postMessage({
        event: 'line',
        line: line
      });
      streamoid.idx = i;
      recurse = function() {
        return linearize(msgRecipient, streamoid);
      };
      return setTimeout(recurse, 0);
    }
  };

  ident = function(data) {
    return data;
  };

  unique_id = function(prefix) {
    if (prefix == null) {
      prefix = 'uid_';
    }
    return prefix + Math.random().toString(36).substr(2, 10);
  };

  sel_to_id = function(selector) {
    // remove the leading hash to make a selector into an id
    return selector.replace(/^\#/, '');
  };

  window.log_click = function() {
    return console.log("%cCLICK", "color:red;font-size:1.8em");
  };

  // http://dublincore.org/documents/dcmi-terms/
  DC_subject = "http://purl.org/dc/terms/subject";

  FOAF_Group = "http://xmlns.com/foaf/0.1/Group";

  FOAF_Person = "http://xmlns.com/foaf/0.1/Person";

  FOAF_name = "http://xmlns.com/foaf/0.1/name";

  OWL_Class = "http://www.w3.org/2002/07/owl#Class";

  OWL_Thing = "http://www.w3.org/2002/07/owl#Thing";

  OWL_ObjectProperty = "http://www.w3.org/2002/07/owl#ObjectProperty";

  RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";

  RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

  RDF_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

  RDF_Class = "http://www.w3.org/2000/01/rdf-schema#Class";

  RDF_subClassOf = "http://www.w3.org/2000/01/rdf-schema#subClassOf";

  RDF_a = 'a';

  RDFS_label = "http://www.w3.org/2000/01/rdf-schema#label";

  SKOS_prefLabel = "http://www.w3.org/2004/02/skos/core#prefLabel";

  XL_literalForm = "http://www.w3.org/2008/05/skos-xl#literalForm";

  TYPE_SYNS = [RDF_type, RDF_a, 'rdfs:type', 'rdf:type'];

  THUMB_PREDS = ['http://dbpedia.org/ontology/thumbnail', 'http://xmlns.com/foaf/0.1/thumbnail'];

  NAME_SYNS = [FOAF_name, RDFS_label, 'rdfs:label', 'name', SKOS_prefLabel, XL_literalForm];

  XML_TAG_REGEX = /(<([^>]+)>)/ig;

  typeSigRE = {
    // https://regex101.com/r/lKClAg/1
    'xsd': new RegExp("^http:\/\/www\.w3\.org\/2001\/XMLSchema\#(.*)$"),
    // https://regex101.com/r/ccfdLS/3/
    'rdf': new RegExp("^http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#(.*)$")
  };

  getPrefixedTypeSignature = function(typeUri) {
    var match, prefix, sig;
    for (prefix in typeSigRE) {
      sig = typeSigRE[prefix];
      match = typeUri.match(sig);
      if (match) {
        return `${prefix}__${match[1]}`;
      }
    }
  };

  getTypeSignature = function(typeUri) {
    var typeSig;
    typeSig = getPrefixedTypeSignature(typeUri);
    return typeSig;
  };

  //return (typeSig or '').split('__')[1]
  PRIMORDIAL_ONTOLOGY = {
    subClassOf: {
      Literal: 'Thing',
      // https://www.w3.org/1999/02/22-rdf-syntax-ns
      // REVIEW(smurp) ignoring all but the rdfs:Datatype instances
      // REVIEW(smurp) should Literal be called Datatype instead?
      "rdf__PlainLiteral": 'Literal',
      "rdf__HTML": 'Literal',
      "rdf__langString": 'Literal',
      "rdf__type": 'Literal',
      "rdf__XMLLiteral": 'Literal',
      // https://www.w3.org/TR/xmlschema11-2/type-hierarchy-201104.png
      // https://www.w3.org/2011/rdf-wg/wiki/XSD_Datatypes
      // REVIEW(smurp) ideally all the xsd types would fall under anyType > anySimpleType > anyAtomicType
      // REVIEW(smurp) what about Built-in list types like: ENTITIES, IDREFS, NMTOKENS ????
      "xsd__anyURI": 'Literal',
      "xsd__base64Binary": 'Literal',
      "xsd__boolean": 'Literal',
      "xsd__date": 'Literal',
      "xsd__dateTimeStamp": 'date',
      "xsd__decimal": 'Literal',
      "xsd__integer": "xsd__decimal",
      "xsd__long": "xsd__integer",
      "xsd__int": "xsd__long",
      "xsd__short": "xsd__int",
      "xsd__byte": "xsd__short",
      "xsd__nonNegativeInteger": "xsd__integer",
      "xsd__positiveInteger": "xsd__nonNegativeInteger",
      "xsd__unsignedLong": "xsd__nonNegativeInteger",
      "xsd__unsignedInt": "xsd__unsignedLong",
      "xsd__unsignedShort": "xsd__unsignedInt",
      "xsd__unsignedByte": "xsd__unsignedShort",
      "xsd__nonPositiveInteger": "xsd__integer",
      "xsd__negativeInteger": "xsd__nonPositiveInteger",
      "xsd__double": 'Literal',
      "xsd__duration": 'Literal',
      "xsd__float": 'Literal',
      "xsd__gDay": 'Literal',
      "xsd__gMonth": 'Literal',
      "xsd__gMonthDay": 'Literal',
      "xsd__gYear": 'Literal',
      "xsd__gYearMonth": 'Literal',
      "xsd__hexBinary": 'Literal',
      "xsd__NOTATION": 'Literal',
      "xsd__QName": 'Literal',
      "xsd__string": 'Literal',
      "xsd__normalizedString": "xsd_string",
      "xsd__token": "xsd__normalizedString",
      "xsd__language": "xsd__token",
      "xsd__Name": "xsd__token",
      "xsd__NCName": "xsd__Name",
      "xsd__time": 'Literal'
    },
    subPropertyOf: {},
    domain: {},
    range: {},
    label: {}
  };

  MANY_SPACES_REGEX = /\s{2,}/g;

  UNDEFINED = void 0;

  start_with_http = new RegExp("http", "ig");

  ids_to_show = start_with_http;

  PEEKING_COLOR = "darkgray";

  themeStyles = {
    "light": {
      "themeName": "theme_white",
      "pageBg": "white",
      "labelColor": "black",
      "shelfColor": "lightgreen",
      "discardColor": "salmon",
      "nodeHighlightOutline": "black"
    },
    "dark": {
      "themeName": "theme_black",
      "pageBg": "black",
      "labelColor": "#ddd",
      "shelfColor": "#163e00",
      "discardColor": "#4b0000",
      "nodeHighlightOutline": "white"
    }
  };

  id_escape = function(an_id) {
    var retval;
    retval = an_id.replace(/\:/g, '_');
    retval = retval.replace(/\//g, '_');
    retval = retval.replace(new RegExp(' ', 'g'), '_');
    retval = retval.replace(new RegExp('\\?', 'g'), '_');
    retval = retval.replace(new RegExp('\=', 'g'), '_');
    retval = retval.replace(new RegExp('\\.', 'g'), '_');
    retval = retval.replace(new RegExp('\\#', 'g'), '_');
    return retval;
  };

  if (true) {
    node_radius_policies = {
      "node radius by links": function(d) {
        d.radius = Math.max(this.node_radius, Math.log(d.links_shown.length));
        return d.radius;
        if (d.showing_links === "none") {
          d.radius = this.node_radius;
        } else {
          if (d.showing_links === "all") {
            d.radius = Math.max(this.node_radius, 2 + Math.log(d.links_shown.length));
          }
        }
        return d.radius;
      },
      "equal dots": function(d) {
        return this.node_radius;
      }
    };
    default_node_radius_policy = "equal dots";
    default_node_radius_policy = "node radius by links";
    has_type = function(subject, typ) {
      return has_predicate_value(subject, RDF_type, typ);
    };
    has_predicate_value = function(subject, predicate, value) {
      var obj, objs, oi, pre;
      pre = subject.predicates[predicate];
      if (pre) {
        objs = pre.objects;
        oi = 0;
        while (oi <= objs.length) {
          obj = objs[oi];
          if (obj.value === value) {
            return true;
          }
          oi++;
        }
      }
      return false;
    };
    is_a_main_node = function(d) {
      return (BLANK_HACK && d.s.id[7] !== "/") || (!BLANK_HACK && d.s.id[0] !== "_");
    };
    is_node_to_always_show = is_a_main_node;
    is_one_of = function(itm, array) {
      return array.indexOf(itm) > -1;
    };
  }

  if (!is_one_of(2, [3, 2, 4])) {
    alert("is_one_of() fails");
  }

  window.blurt = function(str, type, noButton) {
    throw new Error('global blurt() is defunct, use @blurt() on HuViz');
  };

  escapeHtml = function(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };

  SettingsWidget = class SettingsWidget {
    constructor(huviz, inputElem1, state) {
      this.huviz = huviz;
      this.inputElem = inputElem1;
      this.id = unique_id('widget_');
      this.inputJQElem = $(this.inputElem);
    }

    wrap(html) {
      return $(this.inputElem).wrap(html);
    }

  };

  UsernameWidget = (function() {
    class UsernameWidget extends SettingsWidget {
      constructor() {
        super(...arguments);
        this.wrap(`<div id="${this.id
        //  style="border:2px solid; padding:2px
}" class="geo_input_wrap"></div>`);
        //@inputElem.setAttribute('style','border:none')
        this.widgetJQElem = $('#' + this.id);
        this.widgetJQElem.prepend("<i class=\"userIcon fa fa-user-alt\"></i><i class=\"stateIcon fa fa-question\"></i>");
        this.stateIconJQElem = this.widgetJQElem.find('.stateIcon');
        this.userIconJQElem = this.widgetJQElem.find('.userIcon');
        this.set_state('empty');
      }

      set_state(state) {
        var color, stateIcon;
        if (false && this.state && this.state === state) {
          console.log("not bothering to change the state to", state, "cause it already is");
          return;
        }
        this.state = state;
        console.log(state, this.inputJQElem.val());
        stateIcon = this.state_to_state_icon[state];
        this.stateIconJQElem.attr('class', "stateIcon fa " + stateIcon);
        color = this.state_to_color[state];
        this.widgetJQElem.css('border-color', color);
        this.widgetJQElem.css('color', color);
      }

    };

    // https://fontawesome.com/v4.7.0/examples/#animated explains animations fa-spin (continuous) and fa-pulse (8-step)
    UsernameWidget.prototype.state_to_state_icon = {
      bad: 'fa-times', // the username has been tried and failed last use
      good: 'fa-check', // the username has been tried and succeeded last use
      untried: 'fa-question', // a username has been provided but not yet tried
      trying: 'fa-spinner fa-pulse', // performing a lookup with a username which might be bad or good
      empty: 'fa-ellipsis-h', // no username present
      looking: 'fa-map-marker-alt fa-spin' // performing a lookup with a known good username
    };

    UsernameWidget.prototype.state_to_color = {
      bad: 'red',
      good: 'green',
      untried: 'orange',
      trying: 'orange',
      empty: 'grey',
      looking: 'green'
    };

    return UsernameWidget;

  }).call(this);

  GeoUserNameWidget = class GeoUserNameWidget extends UsernameWidget {
    constructor() {
      super(...arguments);
      this.stateIconJQElem.on('click', this.huviz.show_geonames_instructions);
      this.userIconJQElem.on('click', this.huviz.show_geonames_instructions);
    }

  };

  orlando_human_term = {
    all: 'All',
    chosen: 'Activated',
    unchosen: 'Deactivated',
    selected: 'Selected',
    shelved: 'Shelved',
    discarded: 'Discarded',
    hidden: 'Hidden',
    graphed: 'Graphed',
    fixed: 'Pinned',
    labelled: 'Labelled',
    choose: 'Activate',
    unchoose: 'Deactivate',
    wander: 'Wander',
    walk: 'Walk',
    walked: "Walked",
    select: 'Select',
    unselect: 'Unselect',
    label: 'Label',
    unlabel: 'Unlabel',
    shelve: 'Shelve',
    hide: 'Hide',
    discard: 'Discard',
    undiscard: 'Retrieve',
    pin: 'Pin',
    unpin: 'Unpin',
    unpinned: 'Unpinned',
    nameless: 'Nameless',
    blank_verb: 'VERB',
    blank_noun: 'SET/SELECTION',
    hunt: 'Hunt',
    load: 'Load',
    draw: 'Draw',
    undraw: 'Undraw',
    connect: 'Connect',
    spawn: 'Spawn',
    specialize: 'Specialize',
    annotate: 'Annotate',
    seeking_object: 'Object node'
  };

  Huviz = (function() {
    var nodeOrderAngle, node_display_type, renderStyles;

    class Huviz {
      how_heavy_are(n, label, cb) {
        var after, before, buncha, diff, j, k, m, memories, per, ref, retval;
        memories = [];
        memories.push(window.performance.memory);
        if (this.heavy_things == null) {
          this.heavy_things = {};
        }
        buncha = [];
        this.heavy_things[label] = buncha;
        for (m = j = 1, ref = n; (1 <= ref ? j <= ref : j >= ref); m = 1 <= ref ? ++j : --j) {
          retval = cb.call(this, n);
          //console.log(retval)
          buncha.push(retval);
        }
        memories.push(window.performance.memory);
        memories.push({});
        memories.push({});
        [before, after, diff, per] = memories;
        for (k in memories[0]) {
          diff[k] = after[k] - before[k];
          per[k] = diff[k] / n;
        }
        per.what = 'B/' + label;
        before.what = 'before';
        after.what = 'after';
        diff.what = 'diff';
        //console.log(per)
        colorlog(label + ' occupy ' + per.totalJSHeapSize + ' Bytes each');
        console.log('eg', retval);
      }

      //console.table(memories)
      how_heavy(n) {
        // Purpose:
        //   Find out how many Bytes each of the following objects occupy in RAM.
        // Example:
        //   HVZ[0].how_heavy(100000)
        this.how_heavy_are(n, 'Array', function(x) {
          return new Array(100);
        });
        this.how_heavy_are(n, 'Object', function(x) {
          return (new Object())[x] = x;
        });
        this.how_heavy_are(n, 'String', function(x) {
          return "" + x;
        });
        this.how_heavy_are(n, 'Random', function(x) {
          return Math.random();
        });
        return this.how_heavy_are(n, 'SortedSet', function(x) {
          return SortedSet().named(x);
        });
      }

      compose_object_from_defaults_and_incoming(defs, incoming) {
        // Purpose:
        //   To return an object with the properties of defs and incoming layered into it in turn
        // Intended Use Case:
        //   It is frequently the case that one wants to have and object with contains
        //   the default arguments for something and that one also wants the ability to
        //   pass in another object which contains the specifics for the call.
        //   This method joins those things together properly (they can even be null)
        //   to return the amalgamation of the defaults and the incoming arguments.
        if (defs == null) {
          defs = {};
        }
        if (incoming == null) {
          incoming = {};
        }
        return Object.assign(Object.assign({}, defs), incoming);
      }

      gen_dialog_html(contents, id, in_args) {
        var args;
        args = this.compose_object_from_defaults_and_incoming(this.default_dialog_args, in_args);
        //args = Object.assign(default_args, in_args)
        return `<div id="${id}" class="${args.classes} ${args.extraClasses}"\n    style="display:block;top:${args.top}px;left:${args.left}px;max-width:${args.width}px;max-height:${args.height}px">\n  <div class="header" style="background-color:${args.head_bg_color};${args.style}">\n    <button class="close_node_details" title="Close"><i class="far fa-window-close"></i></button>\n  </div>\n  ${contents
// """ for emacs coffeescript mode
}\n</div>`;
      }

      make_dialog(content_html, id, args) {
        var elem;
        if (id == null) {
          id = this.unique_id('dialog_');
        }
        this.addHTML(this.gen_dialog_html(content_html, id, args));
        elem = document.querySelector('#' + id);
        $(elem.querySelector(' .close_node_details')).on('click', this.destroy_box);
        $(elem).draggable();
        return elem;
      }

      destroy_box(e) {
        var box;
        box = e.currentTarget.offsetParent;
        return $(box).remove();
      }

      make_markdown_dialog(markdown, id, args) {
        if (args == null) {
          args = {};
        }
        args.extraClasses += " markdownDialog";
        return this.make_dialog(marked(markdown || ''), id, args);
      }

      unique_id(prefix) {
        if (prefix == null) {
          prefix = 'uid_';
        }
        return prefix + Math.random().toString(36).substr(2, 10);
      }

      change_sort_order(array, cmp) {
        array.__current_sort_order = cmp;
        return array.sort(array.__current_sort_order);
      }

      isArray(thing) {
        return Object.prototype.toString.call(thing) === "[object Array]";
      }

      cmp_on_name(a, b) {
        if (a.name === b.name) {
          return 0;
        }
        if (a.name < b.name) {
          return -1;
        }
        return 1;
      }

      cmp_on_id(a, b) {
        if (a.id === b.id) {
          return 0;
        }
        if (a.id < b.id) {
          return -1;
        }
        return 1;
      }

      binary_search_on(sorted_array, sought, cmp, ret_ins_idx) {
        var bot, c, mid, seeking, top;
        // return -1 or the idx of sought in sorted_array
        // if ret_ins_idx instead of -1 return [n] where n is where it ought to be
        // AKA "RETurn the INSertion INdeX"
        cmp = cmp || sorted_array.__current_sort_order || this.cmp_on_id;
        ret_ins_idx = ret_ins_idx || false;
        seeking = true;
        if (sorted_array.length < 1) {
          if (ret_ins_idx) {
            return {
              idx: 0
            };
          }
          return -1;
        }
        mid = void 0;
        bot = 0;
        top = sorted_array.length;
        while (seeking) {
          mid = bot + Math.floor((top - bot) / 2);
          c = cmp(sorted_array[mid], sought);
          if (c === 0) {
            //console.log(" c =",c);
            return mid;
          }
          if (c < 0) { // ie sorted_array[mid] < sought
            bot = mid + 1;
          } else {
            top = mid;
          }
          if (bot === top) {
            if (ret_ins_idx) {
              return {
                idx: bot
              };
            }
            return -1;
          }
        }
      }

      // Objective:
      //   Maintain a sorted array which acts like a set.
      //   It is sorted so insertions and tests can be fast.
      // cmp: a comparison function returning -1,0,1
      // an integer was returned, ie it was found

      // Perform the set .add operation, adding itm only if not already present

      //if (Array.__proto__.add == null) Array.prototype.add = add;
      // the nodes the user has chosen to see expanded
      // the nodes the user has discarded
      // the nodes which are in the graph, linked together
      // the nodes not displaying links and not discarded
      // keep synced with html
      // bugged
      roughSizeOfObject(object) {
        var bytes, i, objectList, stack, value;
        // http://stackoverflow.com/questions/1248302/javascript-object-size
        objectList = [];
        stack = [object];
        bytes = 0;
        while (stack.length) {
          value = stack.pop();
          if (typeof value === "boolean") {
            bytes += 4;
          } else if (typeof value === "string") {
            bytes += value.length * 2;
          } else if (typeof value === "number") {
            bytes += 8;
          } else if (typeof value === "object" && objectList.indexOf(value) === -1) {
            objectList.push(value);
            for (i in value) {
              stack.push(value[i]);
            }
          }
        }
        return bytes;
      }

      move_node_to_point(node, point) {
        node.x = point[0];
        return node.y = point[1];
      }

      click_node(node_or_id) {
        var evt, node;
        // motivated by testing. Should this also be used by normal click handling?
        console.warn("click_node() is deprecated");
        if (typeof node_or_id === 'string') {
          node = this.nodes.get_by('id', node_or_id);
        } else {
          node = node_or_id;
        }
        this.set_focused_node(node);
        evt = new MouseEvent("mouseup", {
          screenX: node.x,
          screenY: node.y
        });
        this.canvas.dispatchEvent(evt);
        return this;
      }

      click_verb(id) {
        var verbs;
        verbs = $(`#verb-${id}`);
        if (!verbs.length) {
          throw new Error(`verb '${id}' not found`);
        }
        verbs.trigger("click");
        return this;
      }

      click_set(id) {
        var sel, sets;
        if (id === 'nodes') {
          alert("set 'nodes' is deprecated");
          console.error("set 'nodes' is deprecated");
        } else {
          if (!id.endsWith('_set')) {
            id = id + '_set';
          }
        }
        sel = `#${id}`;
        sets = $(sel);
        if (!sets.length) {
          throw new Error(`set '${id}' not found using selector: '${sel}'`);
        }
        sets.trigger("click");
        return this;
      }

      click_predicate(id) {
        this.gclui.predicate_picker.handle_click(id);
        return this;
      }

      click_taxon(id) {
        $(`#${id}`).trigger("click");
        return this;
      }

      like_string(str) {
        // Ideally we'd trigger an actual 'input' event but that is not possible
        //$(".like_input").val(str)
        this.gclui.like_input.val(str);
        this.gclui.handle_like_input();
        //debugger if @DEBUG and str is ""
        return this;
      }

      toggle_expander(id) {
        this.topJQElem.find(`#${id} span.expander:first`).trigger("click");
        return this;
      }

      doit() {
        this.topJQElem.find(".doit_button").trigger("click");
        return this;
      }

      make_cursor_text_while_dragging(action) {
        var drag_or_drop;
        if (action === 'seeking_object') {
          drag_or_drop = 'drag';
        } else {
          drag_or_drop = 'drop';
        }
        return `${this.human_term[drag_or_drop] || drag_or_drop} to ${this.human_term[action] || action}`;
      }

      get_mouse_point(d3_event) {
        if (d3_event == null) {
          d3_event = this.mouse_receiver[0][0];
        }
        return d3.mouse(d3_event);
      }

      should_start_dragging() {
        // We can only know that the users intention is to drag
        // a node once sufficient motion has started, when there
        // is a focused_node
        //console.log "state_name == '" + @focused_node.state.state_name + "' and selected? == " + @focused_node.selected?
        //console.log "START_DRAG: \n  dragging",@dragging,"\n  mousedown_point:",@mousedown_point,"\n  @focused_node:",@focused_node
        return !this.dragging && this.mousedown_point && this.focused_node && distance(this.last_mouse_pos, this.mousedown_point) > this.drag_dist_threshold;
      }

      mousemove() {
        var action, cursor_text, e, edge, edit_state, j, len1, pair, ref, ref1, ref2, ref3, the_node;
        this.last_mouse_pos = this.get_mouse_point();
        if (this.rightClickHold) {
          this.text_cursor.continue();
          this.text_cursor.set_text("Inspect");
          if (this.focused_node) {
            the_node = $(`#${this.focused_node.lid}`);
            if (the_node.html()) {
              the_node.remove();
            }
            this.render_node_info_box();
          } else {
            if ($(".contextMenu.temp")) {
              $(".contextMenu.temp").remove();
            }
          }
        } else if (this.should_start_dragging()) {
          this.dragging = this.focused_node;
          if (this.args.drag_start_handler) {
            try {
              this.args.drag_start_handler.call(this, this.dragging);
            } catch (error1) {
              e = error1;
              console.warn(e);
            }
          }
          if (this.editui.is_state('connecting')) {
            if (this.editui.subject_node !== this.dragging) {
              this.editui.set_subject_node(this.dragging);
            }
          }
          if ((this.dragging.state !== (ref = this.graphed_set) && ref !== this.rightClickHold)) {
            this.graphed_set.acquire(this.dragging);
          }
        }
        if (!this.rightClickHold) {
          if (this.dragging) {
            this.force.resume(); // why?
            if (!this.args.skip_log_tick) {
              console.log("Tick in @force.resume() mousemove");
            }
            this.move_node_to_point(this.dragging, this.last_mouse_pos);
            if (this.editui.is_state('connecting')) {
              this.text_cursor.pause("", "drop on object node");
            } else {
              if (this.dragging.links_shown.length === 0) {
                action = "choose";
              } else if (this.dragging.fixed) {
                action = "unpin";
              } else {
                action = "pin";
              }
              if ((edit_state = this.editui.get_state()) !== 'not_editing') {
                action = edit_state;
              } else if (this.in_disconnect_dropzone(this.dragging)) {
                action = "shelve";
              } else if (this.in_discard_dropzone(this.dragging)) {
                action = "discard";
              }
              cursor_text = this.make_cursor_text_while_dragging(action);
              this.text_cursor.pause("", cursor_text);
            }
          } else {
            // TODO put block "if not @dragging and @mousedown_point and @focused_node and distance" here
            if (this.editui.is_state('connecting')) {
              if (this.editui.object_node || !this.editui.subject_node) {
                if (this.editui.object_datatype_is_literal) {
                  this.text_cursor.set_text("click subject node");
                } else {
                  this.text_cursor.set_text("drag subject node");
                }
              }
            }
          }
        }
        if (this.peeking_node != null) {
          console.log("PEEKING at node: " + this.peeking_node.id);
          if ((this.focused_node != null) && this.focused_node !== this.peeking_node) {
            pair = [this.peeking_node.id, this.focused_node.id];
            ref1 = this.peeking_node.links_shown;
            //console.log "   PEEKING at edge between" + @peeking_node.id + " and " + @focused_node.id
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              edge = ref1[j];
              if ((ref2 = edge.source.id, indexOf.call(pair, ref2) >= 0) && (ref3 = edge.target.id, indexOf.call(pair, ref3) >= 0)) {
                //console.log "PEEK edge.id is '" + edge.id + "'"
                edge.focused = true;
                this.print_edge(edge);
              } else {
                edge.focused = false;
              }
            }
          }
        }
        return this.tick("Tick in mousemove");
      }

      mousedown() {
        this.mousedown_point = this.get_mouse_point();
        return this.last_mouse_pos = this.mousedown_point;
      }

      mouseup() {
        var d3_event, drag_dist, point;
        window.log_click();
        d3_event = this.mouse_receiver[0][0];
        this.mousedown_point = false;
        point = this.get_mouse_point(d3_event);
        if (d3.event.button === 2) { // Right click event so don't alter selected state
          this.text_cursor.continue();
          this.text_cursor.set_text("Select");
          if (this.focused_node) {
            $(`#${this.focused_node.lid}`).removeClass("temp");
          }
          this.rightClickHold = false;
          return;
        }
        // if something was being dragged then handle the drop
        if (this.dragging) {
          //@log_mouse_activity('FINISH A DRAG')
          this.move_node_to_point(this.dragging, point);
          if (this.in_discard_dropzone(this.dragging)) {
            this.run_verb_on_object('discard', this.dragging);
          } else if (this.in_disconnect_dropzone(this.dragging)) { // TODO rename to shelve_dropzone
            this.run_verb_on_object('shelve', this.dragging);
          // @unselect(@dragging) # this might be confusing
          } else if (this.dragging.links_shown.length === 0) {
            this.run_verb_on_object('choose', this.dragging);
          } else if (this.nodes_pinnable) {
            if (this.editui.is_state('connecting') && (this.dragging === this.editui.subject_node)) {
              console.log("not pinning subject_node when dropping");
            } else if (this.dragging.fixed) { // aka pinned
              this.run_verb_on_object('unpin', this.dragging);
            } else {
              this.run_verb_on_object('pin', this.dragging);
            }
          }
          this.dragging = false;
          this.text_cursor.continue();
          return;
        }
        if (this.editui.is_state('connecting') && this.focused_node && this.editui.object_datatype_is_literal) {
          this.editui.set_subject_node(this.focused_node);
          //console.log("edit mode and focused note and editui is literal")
          this.tick("Tick in mouseup 1");
          return;
        }
        // this is the node being clickedRDF_literal
        if (this.focused_node) { // and @focused_node.state is @graphed_set
          this.perform_current_command(this.focused_node);
          this.tick("Tick in mouseup 2");
          return;
        }
        if (this.focused_edge) {
          // FIXME do the edge equivalent of @perform_current_command
          //@update_snippet() # useful when hover-shows-snippet
          this.print_edge(this.focused_edge);
          return;
        }
        // it was a drag, not a click
        drag_dist = distance(point, this.mousedown_point);
        //if drag_dist > @drag_dist_threshold
        //  console.log "drag detection probably bugged",point,@mousedown_point,drag_dist
        //  return
        if (this.focused_node) {
          if (this.focused_node.state !== this.graphed_set) {
            this.run_verb_on_object('choose', this.focused_node);
          } else if (this.focused_node.showing_links === "all") {
            this.run_verb_on_object('print', this.focused_node);
          } else {
            this.run_verb_on_object('choose', this.focused_node);
          }
          // TODO(smurp) are these still needed?
          this.force.links(this.links_set);
          if (!this.args.skip_log_tick) {
            console.log("Tick in @force.links() mouseup");
          }
          this.restart();
        }
      }

      log_mouse_activity(label) {
        return console.log(label, "\n  dragging", this.dragging, "\n  mousedown_point:", this.mousedown_point, "\n  @focused_node:", this.focused_node);
      }

      mouseright() {
        var doesnt_exist, temp;
        d3.event.preventDefault();
        this.text_cursor.continue();
        temp = null;
        this.text_cursor.set_text("Inspect", temp, "#75c3fb");
        this.rightClickHold = true;
        doesnt_exist = this.focused_node ? true : false;
        if (this.focused_node && doesnt_exist) {
          return this.render_node_info_box();
        }
      }

      render_node_info_box() {
        var all_names, color, color_headers, dialogArgs, id_display, j, len1, len2, len3, len4, link_from, name, names_all_langs, node_info, node_out_links, node_type, note, o, other_types, p, ref, ref1, ref2, target, target_prefix, width, z;
        all_names = Object.values(this.focused_node.name);
        names_all_langs = "";
        note = "";
        color_headers = "";
        node_out_links = "";
        for (j = 0, len1 = all_names.length; j < len1; j++) {
          name = all_names[j];
          if (names_all_langs) {
            names_all_langs = names_all_langs + " -- " + name;
          } else {
            names_all_langs = name;
          }
        }
        other_types = "";
        if (this.focused_node._types.length > 1) {
          ref = this.focused_node._types;
          for (o = 0, len2 = ref.length; o < len2; o++) {
            node_type = ref[o];
            if (node_type !== this.focused_node.type) {
              if (other_types) {
                other_types = other_types + ", " + node_type;
              } else {
                other_types = node_type;
              }
            }
          }
          other_types = " (" + other_types + ")";
        }
        //console.log @focused_node
        //console.log @focused_node.links_from.length
        if (this.focused_node.links_from.length > 0) {
          ref1 = this.focused_node.links_from;
          for (p = 0, len3 = ref1.length; p < len3; p++) {
            link_from = ref1[p];
            [target_prefix, target] = this.render_target_for_display(link_from.target);
            node_out_links = node_out_links + `<li><i class='fas fa-long-arrow-alt-right'></i>\n  <a href='${link_from.predicate.id}' target='blank'>${link_from.predicate.lid}</a>\n  ${target_prefix} ${target
          // """
}\n</li>`;
          }
          node_out_links = "<ul>" + node_out_links + "</ul>";
        }
        //console.log @focused_node
        if (this.focused_node._colors) {
          width = 100 / this.focused_node._colors.length;
          ref2 = this.focused_node._colors;
          for (z = 0, len4 = ref2.length; z < len4; z++) {
            color = ref2[z];
            color_headers = color_headers + `<div class='subHeader' style='background-color: ${color}; width: ${width}%;'></div>`;
          }
        }
        if (this.endpoint_loader.value) {
          if (this.endpoint_loader.value && this.focused_node.fully_loaded) {
            note = "<p class='note'>Node Fully Loaded</span>";
          } else {
            note = "<p class='note'><span class='label'>Note:</span>\nThis node may not yet be fully loaded from remote server.\nLink details may not be accurate. Activate to load.</i>"; // """
          }
        }
        dialogArgs = {
          width: this.width * 0.50,
          height: this.height * 0.80,
          top: d3.event.clientY,
          left: d3.event.clientX
        };
        if (this.focused_node) {
          dialogArgs.head_bg_color = this.focused_node.color;
          id_display = this.create_link_if_url(this.focused_node.id);
          node_info = `<p class='id_display'><span class='label'>id:</span> ${id_display}</p>\n<p><span class='label'>name:</span> ${names_all_langs}</p>\n<p><span class='label'>type(s):</span> ${this.focused_node.type} ${other_types}</p>\n<p><span class='label'>Links To:</span> ${this.focused_node.links_to.length} <br>\n  <span class='label'>Links From:</span> ${this.focused_node.links_from.length}</p>\n  ${note}\n  ${node_out_links // """
}`;
          this.make_dialog(node_info, this.unique_id(this.focused_node.lid + '__'), dialogArgs);
        }
      }

      create_link_if_url(possible_link) {
        var target, url_check;
        url_check = possible_link.substring(0, 4);
        if (url_check === "http") {
          return target = `<a href='${possible_link}' target='blank'>${possible_link}</a>`;
        } else {
          return target = possible_link;
        }
      }

      render_target_for_display(node) {
        var arrow, colon, lines, showBlock, typeCURIE;
        if (node.isLiteral) {
          typeCURIE = node.type.replace('__', ':');
          lines = node.name.toString().split(/\r\n|\r|\n/);
          showBlock = lines.length > 1 || node.name.toString().length > 30;
          colon = ":";
          if (showBlock) {
            return [colon, `<blockquote title="${typeCURIE}">${node.name}</blockquote>`];
          } else {
            return [colon, `<code title="${typeCURIE}">${node.name}</code>`];
          }
        } else {
          arrow = "<i class='fas fa-long-arrow-alt-right'></i>";
          return [arrow, this.create_link_if_url(node.id)];
        }
      }

      perform_current_command(node) {
        var cmd;
        if (this.gclui.ready_to_perform()) {
          cmd = new gcl.GraphCommand(this, {
            verbs: this.gclui.engaged_verbs,
            subjects: [node]
          });
          this.run_command(cmd);
        }
        //else
        //  @toggle_selected(node)
        return this.clean_up_all_dirt_once();
      }

      run_command(cmd, callback) {
        //@show_state_msg(cmd.as_msg())
        this.gclui.show_working_on(cmd);
        this.gclc.run(cmd, callback);
        this.gclui.show_working_off();
      }

      /////////////////////////////////////////////////////////////////////////////
      // resize-svg-when-window-is-resized-in-d3-js
      //   http://stackoverflow.com/questions/16265123/
      //@hide_state_msg()
      updateWindow() {
        var instance_container;
        if (!this.container) {
          console.warn('updateWindow() skipped until @container');
          return;
        }
        this.get_container_width();
        this.get_container_height();
        this.update_graph_radius();
        this.update_graph_center();
        this.update_discard_zone();
        this.update_lariat_zone();
        if (this.svg) {
          this.svg.attr("width", this.width).attr("height", this.height);
        }
        if (this.canvas) {
          this.canvas.width = this.width;
          this.canvas.height = this.height;
        }
        this.force.size([this.mx, this.my]);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.size() updateWindow");
        }
        // FIXME all selectors must be localized so if there are two huviz
        //       instances on a page they do not interact
        instance_container = this.args.huviz_top_sel;
        $(`${instance_container} .graph_title_set`).css("width", this.width);
        if (this.tabsJQElem && this.tabsJQElem.length > 0) {
          this.tabsJQElem.css("left", "auto");
        }
        return this.restart();
      }

      /////////////////////////////////////////////////////////////////////////////

      //   http://bl.ocks.org/mbostock/929623
      get_charge(d) {
        var graphed, retval;
        graphed = d.state === this.graphed_set;
        retval = graphed && this.charge || 0; // zero so shelf has no influence
        if (d.charge != null) {
          retval = d.charge;
        }
        //if retval is 0 and graphed
        //  console.error "bad combo of retval and graphed?",retval,graphed,d.name
        return retval;
      }

      get_gravity() {
        return this.gravity;
      }

      // lines: 5845 5848 5852 of d3.v3.js object to
      //    mouse_receiver.call(force.drag);
      // when mouse_receiver == viscanvas
      init_webgl() {
        this.init();
        return this.animate();
      }

      //dump_line(add_line(scene,cx,cy,width,height,'ray'))
      draw_circle(cx, cy, radius, strclr, filclr, start_angle, end_angle, special_focus) {
        var incl_cntr;
        incl_cntr = (start_angle != null) || (end_angle != null);
        start_angle = start_angle || 0;
        end_angle = end_angle || tau;
        if (strclr) {
          this.ctx.strokeStyle = strclr || "blue";
        }
        if (filclr) {
          this.ctx.fillStyle = filclr || "blue";
        }
        this.ctx.beginPath();
        if (incl_cntr) {
          this.ctx.moveTo(cx, cy); // so the arcs are wedges not chords
        }
        // do not incl_cntr when drawing a whole circle
        this.ctx.arc(cx, cy, radius, start_angle, end_angle, true);
        this.ctx.closePath();
        if (strclr) {
          this.ctx.stroke();
        }
        if (filclr) {
          this.ctx.fill();
        }
        if (special_focus) { // true if this is a wander or walk highlighted node
          this.ctx.beginPath();
          radius = radius / 2;
          this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          this.ctx.closePath();
          this.ctx.fillStyle = "black";
          return this.ctx.fill();
        }
      }

      draw_round_img(cx, cy, radius, strclr, filclr, special_focus, imageData, url) {
        var end_angle, img, incl_cntr, start_angle, wh;
        incl_cntr = (typeof start_angle !== "undefined" && start_angle !== null) || (typeof end_angle !== "undefined" && end_angle !== null);
        start_angle = start_angle || 0;
        end_angle = end_angle || tau;
        if (strclr) {
          this.ctx.strokeStyle = strclr || "blue";
        }
        this.ctx.beginPath();
        if (incl_cntr) {
          this.ctx.moveTo(cx, cy); // so the arcs are wedges not chords
        }
        // do not incl_cntr when drawing a whole circle
        this.ctx.arc(cx, cy, radius, start_angle, end_angle, true);
        this.ctx.closePath();
        if (strclr) {
          this.ctx.stroke();
        }
        if (filclr) {
          this.ctx.fill();
        }
        wh = radius * 2;
        if (imageData != null) {
          // note that drawImage can clip for the centering task
          //   https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
          this.ctx.drawImage(imageData, cx - radius, cy - radius, wh, wh);
        } else {
          img = new Image();
          img.src = url;
          this.ctx.drawImage(img, 0, 0, img.width, img.height, cx - radius, cy - radius, wh, wh);
        }
        if (special_focus) { // true if this is a wander or walk highlighted node
          this.ctx.beginPath();
          radius = radius / 2;
          this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          this.ctx.closePath();
          this.ctx.fillStyle = "black";
          return this.ctx.fill();
        }
      }

      draw_triangle(x, y, color, x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.strokeStyle = color;
        this.ctx.lineTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.moveTo(x, y);
        this.ctx.stroke();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        return this.ctx.closePath();
      }

      draw_pie(cx, cy, radius, strclr, filclrs, special_focus) {
        var arc, end_angle, filclr, j, len1, num, results1, start_angle;
        num = filclrs.length;
        if (!num) {
          throw new Error("no colors specified");
        }
        if (num === 1) {
          this.draw_circle(cx, cy, radius, strclr, filclrs[0], false, false, special_focus);
          return;
        }
        arc = tau / num;
        start_angle = 0;
        results1 = [];
        for (j = 0, len1 = filclrs.length; j < len1; j++) {
          filclr = filclrs[j];
          end_angle = start_angle + arc;
          this.draw_circle(cx, cy, radius, strclr, filclr, end_angle, start_angle, special_focus);
          results1.push(start_angle = start_angle + arc);
        }
        return results1;
      }

      draw_line(x1, y1, x2, y2, clr) {
        this.ctx.strokeStyle = clr || 'red';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.closePath();
        return this.ctx.stroke();
      }

      draw_curvedline(x1, y1, x2, y2, sway_inc, clr, num_contexts, line_width, edge, directional_edge) {
        var a_l, a_w, ang, arr_side, arrow_base_x, arrow_base_y, arrow_color, arw_angl, check_range, ctrl_angle, flip, hd_angl, node_radius, orig_angle, pdist, pnt_x, pnt_y, sway, tip_x, tip_y, xctrl, xhndl, xmid, xo1, xo2, yctrl, yhndl, ymid, yo1, yo2;
        pdist = distance([x1, y1], [x2, y2]);
        sway = this.swayfrac * sway_inc * pdist;
        if (pdist < this.line_length_min) {
          return;
        }
        if (sway === 0) {
          return;
        }
        // sway is the distance to offset the control point from the midline
        orig_angle = Math.atan2(x2 - x1, y2 - y1);
        ctrl_angle = orig_angle + (Math.PI / 2);
        ang = ctrl_angle;
        ang = orig_angle;
        check_range = function(val, name) {
          var range;
          window.maxes = window.maxes || {};
          window.ranges = window.ranges || {};
          range = window.ranges[name] || {
            max: -2e308,
            min: 2e308
          };
          range.max = Math.max(range.max, val);
          return range.min = Math.min(range.min, val);
        };
        //check_range(orig_angle,'orig_angle')
        //check_range(ctrl_angle,'ctrl_angle')
        xmid = x1 + (x2 - x1) / 2;
        ymid = y1 + (y2 - y1) / 2;
        xctrl = xmid + Math.sin(ctrl_angle) * sway;
        yctrl = ymid + Math.cos(ctrl_angle) * sway;
        this.ctx.strokeStyle = clr || 'red';
        this.ctx.beginPath();
        this.ctx.lineWidth = line_width;
        this.ctx.moveTo(x1, y1);
        this.ctx.quadraticCurveTo(xctrl, yctrl, x2, y2);
        //@ctx.closePath()
        this.ctx.stroke();
        xhndl = xmid + Math.sin(ctrl_angle) * (sway / 2);
        yhndl = ymid + Math.cos(ctrl_angle) * (sway / 2);
        edge.handle = {
          x: xhndl,
          y: yhndl
        };
        this.draw_circle(xhndl, yhndl, line_width / 2, clr); // draw a circle at the midpoint of the line
        if (directional_edge === "forward") {
          tip_x = x2;
          tip_y = y2;
        } else {
          tip_x = x1;
          tip_y = y1;
        }
        // --------- ARROWS on Edges -----------
        if (this.arrows_chosen) {
          a_l = 8; // arrow length
          a_w = 2; // arrow width
          arr_side = Math.sqrt(a_l * a_l + a_w * a_w);
          arrow_color = "#333"; // clr
          node_radius = this.calc_node_radius(edge.target);
          arw_angl = Math.atan((yctrl - y2) / (xctrl - x2));
          hd_angl = Math.tan(a_w / a_l);
          if (xctrl < x2) {
            flip = -1;
          } else {
            flip = 1; // Flip sign depending on angle
          }
          pnt_x = x2 + flip * node_radius * Math.cos(arw_angl);
          pnt_y = y2 + flip * node_radius * Math.sin(arw_angl);
          arrow_base_x = x2 + flip * (node_radius + a_l) * Math.cos(arw_angl);
          arrow_base_y = y2 + flip * (node_radius + a_l) * Math.sin(arw_angl);
          xo1 = pnt_x + flip * arr_side * Math.cos(arw_angl + hd_angl);
          yo1 = pnt_y + flip * arr_side * Math.sin(arw_angl + hd_angl);
          xo2 = pnt_x + flip * arr_side * Math.cos(arw_angl - hd_angl);
          yo2 = pnt_y + flip * arr_side * Math.sin(arw_angl - hd_angl);
          return this.draw_triangle(pnt_x, pnt_y, arrow_color, xo1, yo1, xo2, yo2);
        }
      }

      draw_disconnect_dropzone() {
        this.ctx.save();
        this.ctx.lineWidth = this.graph_radius * 0.1;
        this.draw_circle(this.lariat_center[0], this.lariat_center[1], this.graph_radius, renderStyles.shelfColor);
        return this.ctx.restore();
      }

      draw_discard_dropzone() {
        this.ctx.save();
        this.ctx.lineWidth = this.discard_radius * 0.1;
        this.draw_circle(this.discard_center[0], this.discard_center[1], this.discard_radius, "", renderStyles.discardColor);
        return this.ctx.restore();
      }

      draw_dropzones() {
        if (this.dragging) {
          this.draw_disconnect_dropzone();
          return this.draw_discard_dropzone();
        }
      }

      in_disconnect_dropzone(node) {
        var dist;
        // is it within the RIM of the disconnect circle?
        dist = distance(node, this.lariat_center);
        return this.graph_radius * 0.9 < dist && this.graph_radius * 1.1 > dist;
      }

      in_discard_dropzone(node) {
        var dist;
        // is it ANYWHERE within the circle?
        dist = distance(node, this.discard_center);
        return this.discard_radius * 1.1 > dist;
      }

      init_sets() {
        //  states: graphed,shelved,discarded,hidden,embryonic
        //  embryonic: incomplete, not ready to be used
        //  graphed: in the graph, connected to other nodes
        //	 shelved: on the shelf, available for choosing
        //	 discarded: in the discard zone, findable but ignored by show_links_*
        //	 hidden: findable, but not displayed anywhere
        //              	 (when found, will become shelved)
        this.nodes = SortedSet().named('all').sort_on("id").labelled(this.human_term.all);
        this.nodes.docs = `${this.nodes.label} nodes are in this set, regardless of state.`;
        this.all_set = this.nodes;
        this.embryonic_set = SortedSet().named("embryo").sort_on("id").isFlag();
        this.embryonic_set.docs = `Nodes which are not yet complete are 'embryonic' and not yet in '${this.all_set.label}'.  Nodes need to have a class and a label to no longer be embryonic.`;
        this.chosen_set = SortedSet().named("chosen").sort_on("id").isFlag().labelled(this.human_term.chosen).sub_of(this.all_set);
        this.chosen_set.docs = `Nodes which the user has specifically '${this.chosen_set.label}' by either dragging them into the graph from the surrounding green 'shelf'. '${this.chosen_set.label}' nodes can drag other nodes into the graph if the others are ${this.human_term.hidden} or ${this.human_term.shelved} but not if they are ${this.human_term.discarded}.`;
        this.chosen_set.cleanup_verb = 'shelve';
        this.selected_set = SortedSet().named("selected").sort_on("id").isFlag().labelled(this.human_term.selected).sub_of(this.all_set);
        this.selected_set.cleanup_verb = "unselect";
        this.selected_set.docs = `Nodes which have been '${this.selected_set.label}' using the class picker, ie which are highlighted and a little larger.`;
        this.shelved_set = SortedSet().named("shelved").sort_on('name').case_insensitive_sort(true).labelled(this.human_term.shelved).sub_of(this.all_set).isState();
        this.shelved_set.docs = `Nodes which are '${this.shelved_set.label}' on the green surrounding 'shelf', either because they have been dragged there or released back to there when the node which pulled them into the graph was '${this.human_term.unchosen}.`;
        this.discarded_set = SortedSet().named("discarded").labelled(this.human_term.discarded).sort_on('name').case_insensitive_sort(true).sub_of(this.all_set).isState();
        this.discarded_set.cleanup_verb = "shelve"; // TODO confirm this
        this.discarded_set.docs = `Nodes which have been '${this.discarded_set.label}' by being dragged into the red 'discard bin' in the bottom right corner. '${this.discarded_set.label}' nodes are not pulled into the graph when nodes they are connected to become '${this.chosen_set.label}'.`;
        this.hidden_set = SortedSet().named("hidden").sort_on("id").labelled(this.human_term.hidden).sub_of(this.all_set).isState();
        this.hidden_set.docs = `Nodes which are '${this.hidden_set.label}' but can be pulled into the graph by other nodes when those become '${this.human_term.chosen}'.`;
        this.hidden_set.cleanup_verb = "shelve";
        this.graphed_set = SortedSet().named("graphed").sort_on("id").labelled(this.human_term.graphed).sub_of(this.all_set).isState();
        this.graphed_set.docs = `Nodes which are included in the central graph either by having been '${this.human_term.chosen}' themselves or which are pulled into the graph by those which have been.`;
        this.graphed_set.cleanup_verb = "unchoose";
        this.wasChosen_set = SortedSet().named("wasChosen").sort_on("id").labelled("Was Chosen").isFlag(); // membership is not mutually exclusive with the isState() sets
        this.wasChosen_set.docs = "Nodes are marked wasChosen by wander__atFirst for later comparison with nowChosen.";
        this.nowChosen_set = SortedSet().named("nowChosen").sort_on("id").labelled("Now Graphed").isFlag(); // membership is not mutually exclusive with the isState() sets
        this.nowChosen_set.docs = "Nodes pulled in by @choose() are marked nowChosen for later comparison against wasChosen by wander__atLast.";
        this.pinned_set = SortedSet().named('fixed').sort_on("id").labelled(this.human_term.fixed).sub_of(this.all_set).isFlag();
        this.pinned_set.docs = `Nodes which are '${this.pinned_set.label}' to the canvas as a result of being dragged and dropped while already being '${this.human_term.graphed}'. ${this.pinned_set.label} nodes can be ${this.human_term.unpinned} by dragging them from their ${this.pinned_set.label} location.`;
        this.pinned_set.cleanup_verb = "unpin";
        this.labelled_set = SortedSet().named("labelled").sort_on("id").labelled(this.human_term.labelled).isFlag().sub_of(this.all_set);
        this.labelled_set.docs = "Nodes which have their labels permanently shown.";
        this.labelled_set.cleanup_verb = "unlabel";
        this.nameless_set = SortedSet().named("nameless").sort_on("id").labelled(this.human_term.nameless).sub_of(this.all_set).isFlag('nameless');
        this.nameless_set.docs = "Nodes for which no name is yet known";
        this.links_set = SortedSet().named("shown").sort_on("id").isFlag();
        this.links_set.docs = "Links which are shown.";
        this.walked_set = SortedSet().named("walked").isFlag().labelled(this.human_term.walked).sub_of(this.chosen_set).sort_on('walkedIdx0'); // sort on index of position in the path; the 0 means zero-based idx
        this.walked_set.docs = "Nodes in order of their walkedness";
        this.predicate_set = SortedSet().named("predicate").isFlag().sort_on("id");
        this.context_set = SortedSet().named("context").isFlag().sort_on("id");
        this.context_set.docs = "The set of quad contexts.";
        // TODO make selectable_sets drive gclui.build_set_picker
        //      with the nesting data coming from .sub_of(@all) as above
        return this.selectable_sets = {
          all_set: this.all_set,
          chosen_set: this.chosen_set,
          selected_set: this.selected_set,
          shelved_set: this.shelved_set,
          discarded_set: this.discarded_set,
          hidden_set: this.hidden_set,
          graphed_set: this.graphed_set,
          labelled_set: this.labelled_set,
          pinned_set: this.pinned_set,
          nameless_set: this.nameless_set,
          walked_set: this.walked_set
        };
      }

      get_set_by_id(setId) {
        setId = setId === 'fixed' && 'pinned' || setId; // because pinned uses fixed as its 'name'
        return this[setId + '_set'];
      }

      update_all_counts() {
        return this.update_set_counts();
      }

      //@update_predicate_counts()
      update_predicate_counts() {
        var a_set, j, len1, name, ref, results1;
        console.warn('the unproven method update_predicate_counts() has just been called');
        ref = this.predicate_set;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          a_set = ref[j];
          name = a_set.lid;
          results1.push(this.gclui.on_predicate_count_update(name, a_set.length));
        }
        return results1;
      }

      update_set_counts() {
        var a_set, name, ref, results1;
        ref = this.selectable_sets;
        results1 = [];
        for (name in ref) {
          a_set = ref[name];
          results1.push(this.gclui.on_set_count_update(name, a_set.length));
        }
        return results1;
      }

      create_taxonomy() {
        // The taxonomy is intertwined with the taxon_picker
        return this.taxonomy = {}; // make driven by the hierarchy
      }

      summarize_taxonomy() {
        var id, out, ref, taxon, tree;
        out = "";
        tree = {};
        ref = this.taxonomy;
        for (id in ref) {
          taxon = ref[id];
          out += `${id}: ${taxon.state}\n`;
          tree[id] = taxon.state;
        }
        return tree;
      }

      regenerate_english() {
        var root;
        root = 'Thing';
        if (this.taxonomy[root] != null) {
          this.taxonomy[root].update_english();
        } else {
          console.log(`not regenerating english because no taxonomy[${root}]`);
        }
      }

      get_or_create_taxon(taxon_id) {
        var label, parent, parent_lid, taxon;
        if (this.taxonomy[taxon_id] == null) {
          taxon = new Taxon(taxon_id);
          this.taxonomy[taxon_id] = taxon;
          parent_lid = this.ontology.subClassOf[taxon_id] || this.HHH[taxon_id] || 'Thing';
          if (parent_lid != null) {
            parent = this.get_or_create_taxon(parent_lid);
            taxon.register_superclass(parent);
            label = this.ontology.label[taxon_id];
          }
          this.gclui.add_taxon(taxon_id, parent_lid, label, taxon); // FIXME should this be an event on the Taxon constructor?
        }
        return this.taxonomy[taxon_id];
      }

      update_labels_on_pickers() {
        var ref, results1, term_id, term_label;
        ref = this.ontology.label;
        results1 = [];
        for (term_id in ref) {
          term_label = ref[term_id];
          // a label might be for a taxon or a predicate, so we must sort out which
          if (this.gclui.taxon_picker.id_to_name[term_id] != null) {
            this.gclui.taxon_picker.set_name_for_id(term_label, term_id);
          }
          if (this.gclui.predicate_picker.id_to_name[term_id] != null) {
            results1.push(this.gclui.predicate_picker.set_name_for_id(term_label, term_id));
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }

      toggle_taxon(id, hier, callback) {
        var ref;
        if (callback != null) {
          this.gclui.set_taxa_click_storm_callback(callback);
        }
        // TODO preserve the state of collapsedness?
        hier = (ref = hier != null) != null ? ref : {
          hier: true // default to true
        };
        if (hier) {
          this.gclui.taxon_picker.collapse_by_id(id);
        }
        this.topJQElem.find(`#${id}`).trigger("click");
        if (hier) {
          return this.gclui.taxon_picker.expand_by_id(id);
        }
      }

      do(args) {
        var cmd;
        cmd = new gcl.GraphCommand(this, args);
        return this.gclc.run(cmd);
      }

      reset_data() {
        // TODO fix gclc.run so it can handle empty sets
        if (this.discarded_set.length) {
          this.do({
            verbs: ['shelve'],
            sets: [this.discarded_set.id]
          });
        }
        if (this.graphed_set.length) {
          this.do({
            verbs: ['shelve'],
            sets: [this.graphed_set.id]
          });
        }
        if (this.hidden_set.length) {
          this.do({
            verbs: ['shelve'],
            sets: [this.hidden_set.id]
          });
        }
        if (this.selected_set.length) {
          this.do({
            verbs: ['unselect'],
            sets: [this.selected_set.id]
          });
        }
        this.gclui.reset_editor();
        return this.gclui.select_the_initial_set();
      }

      perform_tasks_after_dataset_loaded() {
        this.gclui.select_the_initial_set();
        if (!this.args.skip_discover_names) {
          return this.discover_names();
        }
      }

      reset_graph() {
        //@dump_current_settings("at top of reset_graph()")
        this.G = {}; // is this deprecated?
        this.init_sets();
        this.init_gclc();
        this.init_editc_or_not();
        this.indexed_dbservice(); // REVIEW is this needed?
        this.init_indexddbstorage(); // REVIEW and this?
        this.force.nodes(this.nodes);
        this.force.links(this.links_set);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.nodes() reset_graph");
        }
        // TODO move this SVG code to own renderer
        d3.select(`${this.args.huviz_top_sel} .link`).remove();
        d3.select(`${this.args.huviz_top_sel} .node`).remove();
        d3.select(`${this.args.huviz_top_sel} .lariat`).remove();
        this.node = this.svg.selectAll(`${this.args.huviz_top_sel} .node`);
        this.link = this.svg.selectAll(`${this.args.huviz_top_sel
        // looks bogus, see @link assignment below
} .link`);
        this.lariat = this.svg.selectAll(`${this.args.huviz_top_sel} .lariat`);
        this.link = this.link.data(this.links_set);
        this.link.exit().remove();
        this.node = this.node.data(this.nodes);
        this.node.exit().remove();
        this.force.start();
        if (!this.args.skip_log_tick) {
          return console.log("Tick in @force.start() reset_graph2");
        }
      }

      set_node_radius_policy(evt) {
        var f;
        // TODO(shawn) remove or replace this whole method
        f = $("select#node_radius_policy option:selected").val();
        if (!f) {
          return;
        }
        if (typeof f === typeof "str") {
          return this.node_radius_policy = node_radius_policies[f];
        } else if (typeof f === typeof this.set_node_radius_policy) {
          return this.node_radius_policy = f;
        } else {
          return console.log("f =", f);
        }
      }

      DEPRECATED_init_node_radius_policy() {
        var policy_box, policy_name, policy_picker, results1;
        policy_box = d3.select("#huvis_controls").append("div", "node_radius_policy_box");
        policy_picker = policy_box.append("select", "node_radius_policy");
        policy_picker.on("change", set_node_radius_policy);
        results1 = [];
        for (policy_name in node_radius_policies) {
          results1.push(policy_picker.append("option").attr("value", policy_name).text(policy_name));
        }
        return results1;
      }

      calc_node_radius(d) {
        var diff_adjustment, final_adjustment, total_links;
        total_links = d.links_to.length + d.links_from.length;
        diff_adjustment = 10 * (total_links / (total_links + 9));
        final_adjustment = this.node_diff * (diff_adjustment - 1);
        if (d.radius != null) {
          return d.radius;
        }
        return this.node_radius * ((d.selected == null) && 1 || this.selected_mag) + final_adjustment;
      }

      //@node_radius_policy d
      names_in_edges(set) {
        var out;
        out = [];
        set.forEach(function(itm, i) {
          return out.push(itm.source.name + " ---> " + itm.target.name);
        });
        return out;
      }

      dump_details(node) {
        if (!window.dump_details) {
          return;
        }
        
        //    if (! DUMP){
        //      if (node.s.id != '_:E') return;
        //    }

        console.log("=================================================");
        console.log(node.name);
        console.log("  x,y:", node.x, node.y);
        try {
          console.log("  state:", node.state.state_name, node.state);
        } catch (error1) {}
        console.log("  chosen:", node.chosen);
        console.log("  fisheye:", node.fisheye);
        console.log("  fixed:", node.fixed);
        console.log("  links_shown:", node.links_shown.length, this.names_in_edges(node.links_shown));
        console.log("  links_to:", node.links_to.length, this.names_in_edges(node.links_to));
        console.log("  links_from:", node.links_from.length, this.names_in_edges(node.links_from));
        console.log("  showing_links:", node.showing_links);
        return console.log("  in_sets:", node.in_sets);
      }

      find_node_or_edge_closest_to_pointer() {
        var closest_dist, closest_point, focus_threshold, new_focused_edge, new_focused_idx, new_focused_node, seeking;
        new_focused_node = null;
        new_focused_edge = null;
        new_focused_idx = null;
        focus_threshold = this.focus_threshold;
        closest_dist = this.width;
        closest_point = null;
        seeking = null; // holds property name of the thing we are seeking: 'focused_node'/'object_node'/false
        if (this.dragging) {
          if (!this.editui.is_state('connecting')) {
            return;
          }
          seeking = "object_node";
        } else {
          seeking = "focused_node";
        }
        // TODO build a spatial index!!!! OMG https://github.com/smurp/huviz/issues/25
        // Examine every node to find the closest one within the focus_threshold
        this.nodes.forEach((d, i) => {
          var n_dist;
          n_dist = distance(d.fisheye || d, this.last_mouse_pos);
          //console.log(d)
          if (n_dist < closest_dist) {
            closest_dist = n_dist;
            closest_point = d.fisheye || d;
          }
          if (!(seeking === 'object_node' && this.dragging && this.dragging.id === d.id)) {
            if (n_dist <= focus_threshold) {
              new_focused_node = d;
              focus_threshold = n_dist;
              return new_focused_idx = i;
            }
          }
        });
        // Examine the center of every edge and make it the new_focused_edge if close enough and the closest thing
        this.links_set.forEach((e, i) => {
          var e_dist, new_focused_edge_idx;
          if (e.handle != null) {
            e_dist = distance(e.handle, this.last_mouse_pos);
            if (e_dist < closest_dist) {
              closest_dist = e_dist;
              closest_point = e.handle;
            }
            if (e_dist <= focus_threshold) {
              new_focused_edge = e;
              focus_threshold = e_dist;
              return new_focused_edge_idx = i;
            }
          }
        });
        if (new_focused_edge) { // the mouse is closer to an edge than a node
          new_focused_node = null;
          seeking = null;
        }
        if (closest_point) {
          if (this.draw_circle_around_focused) {
            this.draw_circle(closest_point.x, closest_point.y, this.node_radius * 3, "red");
          }
        }
        this.set_focused_node(new_focused_node);
        this.set_focused_edge(new_focused_edge);
        if (seeking === 'object_node') {
          return this.editui.set_object_node(new_focused_node);
        }
      }

      set_focused_node(node) { // node might be null
        var svg_node;
        if (this.focused_node === node) { // no change so skip
          return;
        }
        if (this.focused_node) {
          // unfocus the previously focused_node
          if (this.use_svg) {
            d3.select(".focused_node").classed("focused_node", false);
          }
          //@unscroll_pretty_name(@focused_node)
          this.focused_node.focused_node = false;
        }
        if (node) {
          if (this.use_svg) {
            svg_node = node[0][new_focused_idx];
            d3.select(svg_node).classed("focused_node", true);
          }
          node.focused_node = true;
        }
        this.focused_node = node; // might be null
        if (this.focused_node) {
          //console.log("focused_node:", @focused_node)
          return this.gclui.engage_transient_verb_if_needed("select"); // select is default verb
        } else {
          return this.gclui.disengage_transient_verb_if_needed();
        }
      }

      set_focused_edge(new_focused_edge) {
        if (this.proposed_edge && this.focused_edge) { // TODO why bail now???
          return;
        }
        //console.log "set_focused_edge(#{new_focused_edge and new_focused_edge.id})"
        if (this.focused_edge !== new_focused_edge) {
          if (this.focused_edge != null) {
            console.log("removing focus from previous focused_edge");
            this.focused_edge.focused = false;
            delete this.focused_edge.source.focused_edge;
            delete this.focused_edge.target.focused_edge; //and @focused_edge isnt new_focused_edge
          }
          if (new_focused_edge != null) {
            // FIXME add use_svg stanza
            new_focused_edge.focused = true;
            new_focused_edge.source.focused_edge = true;
            new_focused_edge.target.focused_edge = true;
          }
          this.focused_edge = new_focused_edge; // blank it or set it
          if (this.focused_edge != null) {
            if (this.editui.is_state('connecting')) {
              return this.text_cursor.pause("", "edit this edge");
            } else {
              return this.text_cursor.pause("", "show edge sources");
            }
          } else {
            return this.text_cursor.continue();
          }
        }
      }

      set_proposed_edge(new_proposed_edge) {
        console.log("Setting proposed edge...", new_proposed_edge);
        if (this.proposed_edge) {
          delete this.proposed_edge.proposed; // remove .proposed flag from old one
        }
        if (new_proposed_edge) {
          new_proposed_edge.proposed = true; // flag the new one
        }
        this.proposed_edge = new_proposed_edge; // might be null
        return this.set_focused_edge(new_proposed_edge); // a proposed_edge also becomes focused
      }

      install_update_pointer_togglers() {
        console.warn("the update_pointer_togglers are being called too often");
        d3.select("#huvis_controls").on("mouseover", () => {
          this.update_pointer = false;
          return this.text_cursor.pause("default");
        });
        //console.log "update_pointer: #{@update_pointer}"
        return d3.select("#huvis_controls").on("mouseout", () => {
          this.update_pointer = true;
          return this.text_cursor.continue();
        });
      }

      //console.log "update_pointer: #{@update_pointer}"
      DEPRECATED_adjust_cursor() {
        var next;
        // http://css-tricks.com/almanac/properties/c/cursor/
        if (this.focused_node) {
          next = this.showing_links_to_cursor_map[this.focused_node.showing_links];
        } else {
          next = 'default';
        }
        return this.text_cursor.set_cursor(next);
      }

      set_cursor_for_verbs(verbs) {
        var text, verb;
        if (!this.use_fancy_cursor) {
          return;
        }
        text = [
          (function() {
            var j,
          len1,
          results1;
            results1 = [];
            for (j = 0, len1 = verbs.length; j < len1; j++) {
              verb = verbs[j];
              results1.push(this.human_term[verb]);
            }
            return results1;
          }).call(this)
        ].join("\n");
        if (this.last_cursor_text !== text) {
          this.text_cursor.set_text(text);
          return this.last_cursor_text = text;
        }
      }

      auto_change_verb() {
        if (this.focused_node) {
          return this.gclui.auto_change_verb_if_warranted(this.focused_node);
        }
      }

      get_focused_node_and_its_state() {
        var focused, retval;
        focused = this.focused_node;
        if (!focused) {
          return;
        }
        retval = (focused.lid || '') + ' ';
        if (focused.state == null) {
          console.error(retval + ' has no state!!! This is unpossible!!!! name:', focused.name);
          return;
        }
        retval += focused.state.id;
        return retval;
      }

      on_tick_change_current_command_if_warranted() {
        var nodes;
        // It is warranted if we are hovering over nodes and the last state and this stat differ.
        // The status of the current command might change even if the mouse has not moved, because
        // for instance the graph has wiggled around under a stationary mouse.  For that reason
        // it is legit to go to the trouble of updating the command on the tick.  When though?
        // The command should be changed if one of a number of things has changed since last tick:
        //  * the focused node
        //  * the state of the focused node
        if (this.prior_node_and_state !== this.get_focused_node_and_its_state()) { // ie if it has changed
          if (this.gclui.engaged_verbs.length) {
            nodes = (this.focused_node != null) && [this.focused_node] || [];
            return this.gclui.prepare_command(this.gclui.new_GraphCommand({
              verbs: this.gclui.engaged_verbs,
              subjects: nodes
            }));
          }
        }
      }

      position_nodes_by_force() {
        var only_move_subject;
        only_move_subject = this.editui.is_state('connecting') && this.dragging && this.editui.subject_node;
        return this.nodes.forEach((node, i) => {
          return this.reposition_node_by_force(node, only_move_subject);
        });
      }

      reposition_node_by_force(node, only_move_subject) {
        if (this.dragging === node) {
          this.move_node_to_point(node, this.last_mouse_pos);
        }
        if (only_move_subject) {
          return;
        }
        if (!this.graphed_set.has(node)) { // slower
          return;
        }
        //if node.showing_links is 'none' # faster
        return node.fisheye = this.fisheye(node);
      }

      apply_fisheye() {
        this.links_set.forEach((e) => {
          if (!e.target.fisheye) {
            return e.target.fisheye = this.fisheye(e.target);
          }
        });
        if (this.use_svg) {
          return link.attr("x1", function(d) {
            return d.source.fisheye.x;
          }).attr("y1", function(d) {
            return d.source.fisheye.y;
          }).attr("x2", function(d) {
            return d.target.fisheye.x;
          }).attr("y2", function(d) {
            return d.target.fisheye.y;
          });
        }
      }

      show_message_once(msg, alert_too) {
        if (this.shown_messages.indexOf(msg) === -1) {
          this.shown_messages.push(msg);
          console.log(msg);
          if (alert_too) {
            return alert(msg);
          }
        }
      }

      draw_edges_from(node) {
        var draw_n_n, e, edge_width, edges_between, j, len1, line_width, msg, n_n, num_edges, ref, results1, sway;
        num_edges = node.links_to.length;
        //@show_message_once "draw_edges_from(#{node.id}) "+ num_edges
        if (!num_edges) {
          return;
        }
        draw_n_n = {};
        ref = node.links_shown;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          e = ref[j];
          msg = "";
          if (e.source === node) {
            continue;
          }
          if (e.source.embryo) {
            msg += `source ${e.source.name} is embryo ${e.source.id}; `;
            msg += e.id + " ";
          }
          if (e.target.embryo) {
            msg += `target ${e.target.name} is embryo ${e.target.id}`;
          }
          if (msg !== "") {
            //@show_message_once(msg)
            continue;
          }
          n_n = e.source.lid + " " + e.target.lid;
          if (draw_n_n[n_n] == null) {
            draw_n_n[n_n] = [];
          }
          draw_n_n[n_n].push(e);
        }
        //@show_message_once("will draw edge() n_n:#{n_n} e.id:#{e.id}")
        edge_width = this.edge_width;
        results1 = [];
        for (n_n in draw_n_n) {
          edges_between = draw_n_n[n_n];
          sway = 1;
          results1.push((function() {
            var len2, o, results2;
            results2 = [];
            for (o = 0, len2 = edges_between.length; o < len2; o++) {
              e = edges_between[o];
              //console.log e
              if ((e.focused != null) && e.focused) {
                line_width = this.edge_width * this.peeking_line_thicker;
              } else {
                line_width = edge_width;
              }
              line_width = line_width + (this.line_edge_weight * e.contexts.length);
              //@show_message_once("will draw line() n_n:#{n_n} e.id:#{e.id}")
              this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, e.color, e.contexts.length, line_width, e);
              if (node.walked) { // ie is part of the walk path
                this.draw_walk_edge_from(node, e, sway);
              }
              results2.push(sway++);
            }
            return results2;
          }).call(this));
        }
        return results1;
      }

      draw_walk_edge_from(node, edge, sway) {
        var directional_edge, e;
        //if this line from path node to path node then add black highlight
        if (this.edgeIsOnWalkedPath(edge)) {
          directional_edge = (edge.source.walkedIdx0 > edge.source.walkedIdx0) && 'forward' || 'backward';
          e = edge;
          if (directional_edge) {
            return this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, "black", e.contexts.length, 1, e, directional_edge);
          }
        }
      }

      draw_edges() {
        var dx, dy;
        if (!this.show_edges) {
          return;
        }
        if (this.use_canvas) {
          this.graphed_set.forEach((node, i) => {
            return this.draw_edges_from(node);
          });
        }
        if (this.use_webgl) {
          dx = this.width * xmult;
          dy = this.height * ymult;
          dx = -1 * this.cx;
          dy = -1 * this.cy;
          this.links_set.forEach((e) => {
            var l;
            if (!e.gl) {
              //e.target.fisheye = @fisheye(e.target)  unless e.target.fisheye
              this.add_webgl_line(e);
            }
            l = e.gl;
            
            //	  if (e.source.fisheye.x != e.target.fisheye.x &&
            //	      e.source.fisheye.y != e.target.fisheye.y){
            //	      alert(e.id + " edge has a length");
            //	  }

            this.mv_line(l, e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y);
            return this.dump_line(l);
          });
        }
        if (this.use_webgl && false) {
          return this.links_set.forEach((e, i) => {
            var v;
            if (!e.gl) {
              return;
            }
            v = e.gl.geometry.vertices;
            v[0].x = e.source.fisheye.x;
            v[0].y = e.source.fisheye.y;
            v[1].x = e.target.fisheye.x;
            return v[1].y = e.target.fisheye.y;
          });
        }
      }

      draw_nodes_in_set(set, radius, center) {
        var cx, cy, num;
        // cx and cy are local here TODO(smurp) rename cx and cy
        cx = center[0];
        cy = center[1];
        num = set.length;
        return set.forEach((node, i) => {
          var filclrs, rad, start;
          //clockwise = false
          // 0 or 1 starts at 6, 0.5 starts at 12, 0.75 starts at 9, 0.25 starts at 3
          start = 1 - nodeOrderAngle;
          if (this.display_shelf_clockwise) {
            rad = tau * (start - i / num);
          } else {
            rad = tau * (i / num + start);
          }
          node.rad = rad;
          node.x = cx + Math.sin(rad) * radius;
          node.y = cy + Math.cos(rad) * radius;
          node.fisheye = this.fisheye(node);
          if (this.use_canvas) {
            filclrs = this.get_node_color_or_color_list(node, renderStyles.nodeHighlightOutline);
            this.draw_pie(node.fisheye.x, node.fisheye.y, this.calc_node_radius(node), node.color || "yellow", filclrs);
          }
          if (this.use_webgl) {
            return this.mv_node(node.gl, node.fisheye.x, node.fisheye.y);
          }
        });
      }

      draw_discards() {
        return this.draw_nodes_in_set(this.discarded_set, this.discard_radius, this.discard_center);
      }

      draw_shelf() {
        return this.draw_nodes_in_set(this.shelved_set, this.graph_radius, this.lariat_center);
      }

      draw_nodes() {
        if (this.use_svg) {
          node.attr("transform", function(d, i) {
            return "translate(" + d.fisheye.x + "," + d.fisheye.y + ")";
          }).attr("r", calc_node_radius);
        }
        if (this.use_canvas || this.use_webgl) {
          return this.graphed_set.forEach((d, i) => {
            var e, filclr, imageData, imgUrl, node_radius, pill_height, pill_width, rndng, special_focus, stroke_color, x, y;
            d.fisheye = this.fisheye(d);
            //console.log d.name.NOLANG
            if (this.use_canvas) {
              node_radius = this.calc_node_radius(d);
              stroke_color = d.color || 'yellow';
              if (d.chosen != null) {
                stroke_color = renderStyles.nodeHighlightOutline;
                // if the node d is in the @walked_set it needs special_focus
                special_focus = !!d.walked; // "not not" forces boolean
              }
              // if 'pills' is selected; change node shape to rounded squares
              if (node_display_type === 'pills') {
                pill_width = node_radius * 2;
                pill_height = node_radius * 2;
                filclr = this.get_node_color_or_color_list(d);
                rndng = 1;
                x = d.fisheye.x;
                y = d.fisheye.y;
                this.rounded_rectangle(x, y, pill_width, pill_height, rndng, stroke_color, filclr);
              } else if (this.show_images_in_nodes && (imgUrl = d.__thumbnail || this.args.default_node_url)) {
                try {
                  imageData = this.get_or_create_round_img(imgUrl);
                } catch (error1) {
                  e = error1;
                  console.error(e);
                }
                this.draw_round_img(d.fisheye.x, d.fisheye.y, node_radius, stroke_color, filclr, special_focus, imageData, imgUrl);
              } else {
                this.draw_pie(d.fisheye.x, d.fisheye.y, node_radius, stroke_color, this.get_node_color_or_color_list(d), special_focus);
              }
            }
            if (this.use_webgl) {
              return this.mv_node(d.gl, d.fisheye.x, d.fisheye.y);
            }
          });
        }
      }

      get_node_color_or_color_list(n, default_color) {
        if (default_color == null) {
          default_color = 'black';
        }
        if (this.color_nodes_as_pies && n._types && n._types.length > 1) {
          this.recolor_node(n, default_color);
          return n._colors;
        }
        return [n.color || default_color];
      }

      get_or_create_round_img(url) {
        var ctx, display_image_size, img, imgId, origImage, roundImage, round_image_maker;
        if (this.round_img_cache == null) {
          this.round_img_cache = {};
        }
        display_image_size = 128;
        if (!(img = this.round_img_cache[url])) {
          imgId = this.unique_id('round_img_');
          roundImage = document.createElement('img');
          round_image_maker = document.createElement("CANVAS");
          round_image_maker.width = display_image_size; // size of ultimate image
          round_image_maker.height = display_image_size;
          ctx = round_image_maker.getContext("2d");
          origImage = new Image();
          origImage.crossOrigin = "Anonymous";
          origImage.src = url; // path to image file
          origImage.onload = function() { // When image is loaded create a new round image
            var h, w, x, y;
            ctx.beginPath();
            // This needs to be half the size of height/width to fill canvas area
            ctx.arc(display_image_size / 2, display_image_size / 2, display_image_size / 2, 0, 2 * Math.PI, false);
            ctx.clip();
            ctx.fillStyle = renderStyles.pageBg;
            ctx.fill();
            if (origImage.width > origImage.height) { // Landscape image
              w = Math.round(origImage.width * display_image_size / origImage.height);
              h = Math.round(display_image_size);
              x = -Math.round((w - h) / 2);
              y = 0; // Portrait image
            } else {
              w = Math.round(display_image_size);
              h = Math.round(origImage.height * display_image_size / origImage.width);
              x = 0;
              y = Math.round((w - h) / 2);
            }
            ctx.drawImage(origImage, x, y, w, h); // This just paints the image as is
            return roundImage.src = round_image_maker.toDataURL();
          };
          this.round_img_cache[url] = roundImage;
        }
        return roundImage;
      }

      get_label_attributes(d) {
        var browser_font_size, bubble_text, focused_font_size, font_size, height, i, j, label_length, label_measure, len1, line_height, line_length, ln_i, max_len, max_line_length, min_len, new_line_length, new_line_width, num_lines, num_lines_raw, padding, real_line_length, text, text_cuts, text_split, width, width_default, word, word_length;
        text = d.pretty_name;
        label_measure = this.ctx.measureText(text); //this is total length of text (in ems?)
        browser_font_size = 12.8; // -- Setting or auto from browser?
        focused_font_size = this.label_em * browser_font_size * this.focused_mag;
        padding = focused_font_size * 0.5;
        line_height = focused_font_size * 1.25; // set line height to 125%
        max_len = 250;
        min_len = 100;
        label_length = label_measure.width + 2 * padding;
        num_lines_raw = label_length / max_len;
        num_lines = (Math.floor(num_lines_raw)) + 1;
        if (num_lines > 1) {
          width_default = this.label_em * label_measure.width / num_lines;
        } else {
          width_default = max_len;
        }
        bubble_text = [];
        text_cuts = [];
        ln_i = 0;
        bubble_text[ln_i] = "";
        if (label_length < (width_default + 2 * padding)) { // single line label
          max_line_length = label_length - padding; // more than one line so calculate how many and create text lines array
        } else {
          text_split = text.split(' '); // array of words
          max_line_length = 0;
          for (i = j = 0, len1 = text_split.length; j < len1; i = ++j) {
            word = text_split[i];
            word_length = this.ctx.measureText(word); //Get length of next word
            line_length = this.ctx.measureText(bubble_text[ln_i]);
            new_line_length = word_length.width + line_length.width; //add together for testing
            if (new_line_length < width_default) { //if line length is still less than max
              bubble_text[ln_i] = bubble_text[ln_i] + word + " "; //add word to bubble_text
//new line needed
            } else {
              text_cuts[ln_i] = i;
              real_line_length = this.ctx.measureText(bubble_text[ln_i]);
              new_line_width = real_line_length.width;
              if (new_line_width > max_line_length) { // remember longest line lengthth
                max_line_length = real_line_length.width;
              }
              ln_i++;
              bubble_text[ln_i] = word + " ";
            }
          }
        }
        width = max_line_length + 2 * padding; //set actual width of box to longest line of text
        height = (ln_i + 1) * line_height + 2 * padding; // calculate height using wrapping text
        font_size = this.label_em;
        //console.log text
        //console.log "focused_font_size: " + focused_font_size
        //console.log "line height: " + line_height
        //console.log "padding: " + padding
        //console.log "label_length: " + label_length
        //console.log "bubble height: " + height
        //console.log "max_line_length: " + max_line_length
        //console.log "bubble width: " + width
        //console.log "bubble cut points: "
        //console.log text_cuts
        return d.bub_txt = [width, height, line_height, text_cuts, font_size];
      }

      should_show_label(node) {
        return node.labelled || node.focused_edge || (this.label_graphed && node.state === this.graphed_set) || dist_lt(this.last_mouse_pos, node, this.label_show_range) || ((node.name != null) && node.name.match(this.search_regex)); // FIXME make this a flag that gets updated ONCE when the regex changes not something deep in loop!!!
      }

      draw_labels() {
        var focused_font, focused_font_size, focused_pill_font, label_node, unfocused_font;
        if (this.use_svg) {
          label.attr("style", function(d) {
            if (this.should_show_label(d)) {
              return "";
            } else {
              return "display:none";
            }
          });
        }
        if (this.use_canvas || this.use_webgl) {
          // http://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
          // http://diveintohtml5.info/canvas.html#text
          // http://stackoverflow.com/a/10337796/1234699
          focused_font_size = this.label_em * this.focused_mag;
          focused_font = `${focused_font_size}em sans-serif`;
          unfocused_font = `${this.label_em}em sans-serif`;
          focused_pill_font = `${this.label_em}em sans-serif`;
          label_node = (node) => {
            var adjust_x, adjust_y, alpha, ctx, cuts, fill, flip, flip_point, i, j, label, len1, line_height, node_font_size, outline, pill_height, pill_width, print_label, radians, radius, result, text, textAlign, text_split, x, y;
            if (!this.should_show_label(node)) {
              return;
            }
            ctx = this.ctx;
            ctx.textBaseline = "middle";
            // perhaps scrolling should happen here
            //if not node_display_type and (node.focused_node or node.focused_edge?)
            if (node.focused_node || (node.focused_edge != null)) {
              label = this.scroll_pretty_name(node);
              ctx.fillStyle = node.color;
              ctx.font = focused_font;
            } else {
              ctx.fillStyle = renderStyles.labelColor; //"white" is default
              ctx.font = unfocused_font;
            }
            if (node.fisheye == null) {
              return;
            }
            flip_point = this.cx;
            if (this.discarded_set.has(node)) {
              flip_point = this.discard_center[0];
            } else if (this.shelved_set.has(node)) {
              flip_point = this.lariat_center[0];
            }
            if (!this.graphed_set.has(node) && this.draw_lariat_labels_rotated) {
              // Flip label rather than write upside down
              //   var flip = (node.rad > Math.PI) ? -1 : 1;
              //   view-source:http://www.jasondavies.com/d3-dependencies/
              radians = node.rad;
              flip = node.fisheye.x < flip_point; // @cx  # flip labels on the left of center line
              textAlign = 'left';
              if (flip) {
                radians = radians - Math.PI;
                textAlign = 'right';
              }
              ctx.save();
              ctx.translate(node.fisheye.x, node.fisheye.y);
              ctx.rotate(-1 * radians + Math.PI / 2);
              ctx.textAlign = textAlign;
              if (this.debug_shelf_angles_and_flipping) {
                if (flip) { //radians < 0
                  ctx.fillStyle = 'rgb(255,0,0)';
                }
                ctx.fillText(("  " + flip + "  " + radians).substr(0, 14), 0, 0);
              } else {
                ctx.fillText("  " + node.pretty_name + "  ", 0, 0);
              }
              return ctx.restore();
            } else {
              if (node_display_type === 'pills') {
                node_font_size = node.bub_txt[4];
                result = node_font_size !== this.label_em;
                if (!node.bub_txt.length || result) {
                  this.get_label_attributes(node);
                }
                line_height = node.bub_txt[2];
                adjust_x = node.bub_txt[0] / 2 - line_height / 2; // Location of first line of text
                adjust_y = node.bub_txt[1] / 2 - line_height;
                pill_width = node.bub_txt[0];
                pill_height = node.bub_txt[1];
                x = node.fisheye.x - pill_width / 2;
                y = node.fisheye.y - pill_height / 2;
                radius = 10 * this.label_em;
                alpha = 1;
                outline = node.color;
                // change box edge thickness and fill if node selected
                if (node.focused_node || (node.focused_edge != null)) {
                  ctx.lineWidth = 2;
                  fill = "#f2f2f2";
                } else {
                  ctx.lineWidth = 1;
                  fill = "white";
                }
                this.rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha);
                ctx.fillStyle = "#000";
                // Paint multi-line text
                text = node.pretty_name;
                text_split = text.split(' '); // array of words
                cuts = node.bub_txt[3];
                print_label = "";
                for (i = j = 0, len1 = text_split.length; j < len1; i = ++j) {
                  text = text_split[i];
                  if (cuts && indexOf.call(cuts, i) >= 0) {
                    ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
                    adjust_y = adjust_y - line_height;
                    print_label = text + " ";
                  } else {
                    print_label = print_label + text + " ";
                  }
                }
                if (print_label) { // print last line, or single line if no cuts
                  return ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
                }
              } else {
                return ctx.fillText("  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y);
              }
            }
          };
          this.graphed_set.forEach(label_node);
          this.shelved_set.forEach(label_node);
          return this.discarded_set.forEach(label_node);
        }
      }

      draw_focused_labels() {
        var ctx, focused_font, focused_font_size, focused_pill_font, highlight_node;
        ctx = this.ctx;
        focused_font_size = this.label_em * this.focused_mag;
        focused_font = `${focused_font_size}em sans-serif`;
        focused_pill_font = `${this.label_em}em sans-serif`;
        highlight_node = (node) => {
          var adjust_x, adjust_y, alpha, cart_label, cuts, fill, i, j, label, len1, line_height, node_font_size, outline, pill_height, pill_width, print_label, radius, result, text, text_split, x, y;
          if (node.focused_node || (node.focused_edge != null)) {
            if (node_display_type === 'pills') {
              ctx.font = focused_pill_font;
              node_font_size = node.bub_txt[4];
              result = node_font_size !== this.label_em;
              if (!node.bub_txt.length || result) {
                this.get_label_attributes(node);
              }
              line_height = node.bub_txt[2];
              adjust_x = node.bub_txt[0] / 2 - line_height / 2; // Location of first line of text
              adjust_y = node.bub_txt[1] / 2 - line_height;
              pill_width = node.bub_txt[0];
              pill_height = node.bub_txt[1];
              x = node.fisheye.x - pill_width / 2;
              y = node.fisheye.y - pill_height / 2;
              radius = 10 * this.label_em;
              alpha = 1;
              outline = node.color;
              // change box edge thickness and fill if node selected
              if (node.focused_node || (node.focused_edge != null)) {
                ctx.lineWidth = 2;
                fill = "#f2f2f2";
              } else {
                ctx.lineWidth = 1;
                fill = "white";
              }
              this.rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha);
              ctx.fillStyle = "#000";
              // Paint multi-line text
              text = node.pretty_name;
              text_split = text.split(' '); // array of words
              cuts = node.bub_txt[3];
              print_label = "";
              for (i = j = 0, len1 = text_split.length; j < len1; i = ++j) {
                text = text_split[i];
                if (cuts && indexOf.call(cuts, i) >= 0) {
                  ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
                  adjust_y = adjust_y - line_height;
                  print_label = text + " ";
                } else {
                  print_label = print_label + text + " ";
                }
              }
              if (print_label) { // print last line, or single line if no cuts
                return ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
              }
            } else {
              label = this.scroll_pretty_name(node);
              if (node.state.id === "graphed") {
                cart_label = node.pretty_name;
                ctx.measureText(cart_label).width; //forces proper label measurement (?)
                if (this.cartouches) {
                  this.draw_cartouche(cart_label, focused_font_size, node.fisheye.x, node.fisheye.y);
                }
              }
              ctx.fillStyle = node.color; // This is the mouseover highlight color when GRAPHED
              ctx.font = focused_font;
              return ctx.fillText("  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y);
            }
          }
        };
        return this.graphed_set.forEach(highlight_node);
      }

      clear_canvas() {
        return this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }

      blank_screen() {
        if (this.use_canvas || this.use_webgl) {
          return this.clear_canvas();
        }
      }

      should_position_by_packing() {
        return !this.show_edges;
      }

      position_nodes_by_packing() {
        var i, n, q, results1;
        // https://bl.ocks.org/mbostock/3231298
        if (!this.should_position_by_packing()) {
          return;
        }
        q = d3.geom.quadtree(this.graphed_set);
        i = 0;
        n = this.graphed_set.length;
        results1 = [];
        while (++i < n) {
          results1.push(q.visit(this.position_node_by_packing(this.graphed_set[i])));
        }
        return results1;
      }

      position_node_by_packing(node) {
        var nx1, nx2, ny1, ny2, r;
        r = node.radius + 16;
        nx1 = node.x - r;
        nx2 = node.x + r;
        ny1 = node.y - r;
        ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
          var l, x, y;
          if (quad.point && (quad.point !== node)) {
            x = node.x - quad.point.x;
            y = node.y - quad.point.y;
            l = Math.sqrt(x * x + y * y);
            r = node.radius + quad.point.radius;
            if (l < r) {
              l = (l(-r)) / 1 * .5;
              node.x -= x *= l;
              node.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
      }

      respect_single_chosen_node() {
        var chosen_node, cmd, dirty, j, len1, pinned_node, ref;
        dirty = false;
        if (this.chosen_set.length === 1) {
          chosen_node = this.chosen_set[0];
          if (!chosen_node.pinned) {
            cmd = {
              polar_coords: {
                range: 0,
                degrees: 0
              }
            };
            this.pin(chosen_node, cmd);
            dirty = true;
            chosen_node.pinned_only_while_chosen = true;
          }
        }
        ref = this.pinned_set;
        // Uncenter nodes which are no longer the only chosen node
        for (j = 0, len1 = ref.length; j < len1; j++) {
          pinned_node = ref[j];
          if (!pinned_node) {
            continue; // how can this even happen?
          }
          if ((pinned_node.pinned_only_while_chosen != null) && (!pinned_node.chosen || this.chosen_set.length !== 1 || !this.single_chosen)) {
            this.unpin(pinned_node);
            dirty = true;
          }
        }
        if (dirty) {
          return this.update_set_counts();
        }
      }

      tick(msg) {
        var base1, base2;
        if (this.ctx == null) {
          return;
        }
        if (typeof msg === 'string' && !this.args.skip_log_tick) {
          console.log(msg);
        }
        // return if @focused_node   # <== policy: freeze screen when selected
        if (true) {
          if (this.clean_up_all_dirt_onceRunner != null) {
            if (this.clean_up_all_dirt_onceRunner.active) {
              if ((base1 = this.clean_up_all_dirt_onceRunner.stats).runTick == null) {
                base1.runTick = 0;
              }
              if ((base2 = this.clean_up_all_dirt_onceRunner.stats).skipTick == null) {
                base2.skipTick = 0;
              }
              this.clean_up_all_dirt_onceRunner.stats.skipTick++;
              return;
            } else {
              this.clean_up_all_dirt_onceRunner.stats.runTick++;
            }
          }
        }
        this.ctx.lineWidth = this.edge_width; // TODO(smurp) just edges should get this treatment
        this.respect_single_chosen_node();
        this.find_node_or_edge_closest_to_pointer();
        this.auto_change_verb();
        this.on_tick_change_current_command_if_warranted();
        //@update_snippet() // not in use
        this.blank_screen();
        this.draw_dropzones();
        this.fisheye.focus(this.last_mouse_pos);
        this.show_last_mouse_pos();
        if (this.should_position_by_packing()) {
          this.position_nodes_by_packing();
        } else {
          this.position_nodes_by_force();
        }
        this.apply_fisheye();
        this.draw_edges();
        this.draw_nodes();
        this.draw_shelf();
        this.draw_discards();
        this.draw_labels();
        this.draw_edge_labels();
        this.draw_focused_labels();
        this.pfm_count('tick');
        this.prior_node_and_state = this.get_focused_node_and_its_state();
      }

      rounded_rectangle(x, y, w, h, radius, fill, stroke, alpha) {
        var b, ctx, r;
        // http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
        ctx = this.ctx;
        ctx.fillStyle = fill;
        r = x + w;
        b = y + h;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(r - radius, y);
        ctx.quadraticCurveTo(r, y, r, y + radius);
        ctx.lineTo(r, y + h - radius);
        ctx.quadraticCurveTo(r, b, r - radius, b);
        ctx.lineTo(x + radius, b);
        ctx.quadraticCurveTo(x, b, x, b - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (alpha) {
          ctx.globalAlpha = alpha;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        if (stroke) {
          ctx.strokeStyle = stroke;
          return ctx.stroke();
        }
      }

      draw_cartouche(label, focused_font_size, x, y) {
        var ctx, focused_font, height, width;
        ctx = this.ctx;
        width = this.ctx.measureText(label).width * focused_font_size;
        focused_font = `${focused_font_size}em sans-serif`;
        height = this.label_em * this.focused_mag * 16;
        ctx.font = focused_font;
        ctx.strokeStyle = renderStyles.pageBg;
        ctx.lineWidth = 5;
        return ctx.strokeText("  " + label + "  ", x, y);
      }

      draw_edge_labels() {
        var edge, j, len1, ref, results1;
        if (!this.show_edges) {
          return;
        }
        if (this.focused_edge != null) {
          this.draw_edge_label(this.focused_edge);
        }
        if (this.show_edge_labels_adjacent_to_labelled_nodes) {
          ref = this.links_set;
          results1 = [];
          for (j = 0, len1 = ref.length; j < len1; j++) {
            edge = ref[j];
            if (edge.target.labelled || edge.source.labelled) {
              results1.push(this.draw_edge_label(edge));
            } else {
              results1.push(void 0);
            }
          }
          return results1;
        }
      }

      draw_edge_label(edge) {
        var ctx, height, label, width;
        ctx = this.ctx;
        // TODO the edge label should really come from the pretty name of the predicate
        //   edge.label > edge.predicate.label > edge.predicate.lid
        label = edge.label || edge.predicate.lid;
        if (this.snippet_count_on_edge_labels) {
          if (edge.contexts != null) {
            if (edge.contexts.length) {
              label += ` (${edge.contexts.length})`;
            }
          }
        }
        width = ctx.measureText(label).width;
        height = this.label_em * this.focused_mag * 16;
        if (this.cartouches) {
          this.draw_cartouche(label, this.label_em, edge.handle.x, edge.handle.y);
        }
        //ctx.fillStyle = '#666' #@shadow_color
        //ctx.fillText " " + label, edge.handle.x + @edge_x_offset + @shadow_offset, edge.handle.y + @shadow_offset
        ctx.fillStyle = edge.color;
        return ctx.fillText(" " + label, edge.handle.x + this.edge_x_offset, edge.handle.y);
      }

      update_snippet() {
        if (this.show_snippets_constantly && (this.focused_edge != null) && this.focused_edge !== this.printed_edge) {
          return this.print_edge(this.focused_edge);
        }
      }

      show_state_msg(txt) {
        if (false) {
          this.msg_history += " " + txt;
          txt = this.msg_history;
        }
        this.state_msg_box.show();
        this.state_msg_box.html("<div class='msg_payload'>" + txt + "</div><div class='msg_backdrop'></div>");
        this.state_msg_box.on('click', this.hide_state_msg);
        return this.text_cursor.pause("wait");
      }

      hide_state_msg() {
        this.state_msg_box.hide();
        return this.text_cursor.continue();
      }

      //@text_cursor.set_cursor("default")
      svg_restart() {
        var nodeEnter;
        // console.log "svg_restart()"
        this.link = this.link.data(this.links_set);
        this.link.enter().insert("line", ".node").attr("class", function(d) {
          //console.log(l.geometry.vertices[0].x,l.geometry.vertices[1].x);
          return "link";
        });
        this.link.exit().remove();
        this.node = this.node.data(this.nodes);
        this.node.exit().remove();
        nodeEnter = this.node.enter().append("g").attr("class", "lariat node").call(force.drag);
        nodeEnter.append("circle").attr("r", calc_node_radius).style("fill", function(d) {
          return d.color;
        });
        nodeEnter.append("text").attr("class", "label").attr("style", "").attr("dy", ".35em").attr("dx", ".4em").text(function(d) {
          return d.name;
        });
        return this.label = this.svg.selectAll(".label");
      }

      canvas_show_text(txt, x, y) {
        // console.log "canvas_show_text(" + txt + ")"
        this.ctx.fillStyle = "black";
        this.ctx.font = "12px Courier";
        return this.ctx.fillText(txt, x, y);
      }

      pnt2str(x, y) {
        return "[" + Math.floor(x) + ", " + Math.floor(y) + "]";
      }

      show_pos(x, y, dx, dy) {
        dx = dx || 0;
        dy = dy || 0;
        return this.canvas_show_text(pnt2str(x, y), x + dx, y + dy);
      }

      show_line(x0, y0, x1, y1, dx, dy, label) {
        dx = dx || 0;
        dy = dy || 0;
        label = typeof label === "undefined" && "" || label;
        return this.canvas_show_text(pnt2str(x0, y0) + "-->" + pnt2str(x0, y0) + " " + label, x1 + dx, y1 + dy);
      }

      add_webgl_line(e) {
        return e.gl = this.add_line(scene, e.source.x, e.source.y, e.target.x, e.target.y, e.source.s.id + " - " + e.target.s.id, "green");
      }

      //dump_line(e.gl);
      webgl_restart() {
        return links_set.forEach((d) => {
          return this.add_webgl_line(d);
        });
      }

      restart() {
        if (this.use_svg) {
          this.svg_restart();
        }
        this.force.start();
        if (!this.args.skip_log_tick) {
          return console.log("Tick in @force.start() restart");
        }
      }

      show_last_mouse_pos() {
        return this.draw_circle(this.last_mouse_pos[0], this.last_mouse_pos[1], this.focus_radius, "yellow");
      }

      remove_ghosts(e) {
        if (this.use_webgl) {
          if (e.gl) {
            this.remove_gl_obj(e.gl);
          }
          return delete e.gl;
        }
      }

      add_node_ghosts(d) {
        if (this.use_webgl) {
          return d.gl = add_node(scene, d.x, d.y, 3, d.color);
        }
      }

      add_to(itm, array, cmp) {
        var c;
        // FIXME should these arrays be SortedSets instead?
        cmp = cmp || array.__current_sort_order || this.cmp_on_id;
        c = this.binary_search_on(array, itm, cmp, true);
        if (typeof c === typeof 3) {
          return c;
        }
        array.splice(c.idx, 0, itm);
        return c.idx;
      }

      remove_from(itm, array, cmp) {
        var c;
        cmp = cmp || array.__current_sort_order || this.cmp_on_id;
        c = this.binary_search_on(array, itm, cmp);
        if (c > -1) {
          array.splice(c, 1);
        }
        return array;
      }

      fire_newsubject_event(s) {
        return window.dispatchEvent(new CustomEvent('newsubject', {
          detail: {
            sid: s
          },
          // time: new Date()
          bubbles: true,
          cancelable: true
        }));
      }

      ensure_predicate_lineage(pid) {
        var parent_lid, pred_lid, pred_name;
        // Ensure that fire_newpredicate_event is run for pid all the way back
        // to its earliest (possibly abstract) parent starting with the earliest
        pred_lid = uniquer(pid);
        if (this.my_graph.predicates[pred_lid] == null) {
          if (this.ontology.subPropertyOf[pred_lid] != null) {
            parent_lid = this.ontology.subPropertyOf[pred_lid];
          } else {
            parent_lid = "anything";
          }
          this.my_graph.predicates[pred_lid] = [];
          this.ensure_predicate_lineage(parent_lid);
          pred_name = typeof this.ontology === "function" ? this.ontology(label[pred_lid]) : void 0;
          return this.fire_newpredicate_event(pid, pred_lid, parent_lid, pred_name);
        }
      }

      fire_newpredicate_event(pred_uri, pred_lid, parent_lid, pred_name) {
        return window.dispatchEvent(new CustomEvent('newpredicate', {
          detail: {
            pred_uri: pred_uri,
            pred_lid: pred_lid,
            parent_lid: parent_lid,
            pred_name: pred_name
          },
          bubbles: true,
          cancelable: true
        }));
      }

      auto_discover_header(uri, digestHeaders, sendHeaders) {
        // THIS IS A FAILED EXPERIMENT BECAUSE
        // It turns out that for security reasons AJAX requests cannot show
        // the headers of redirect responses.  So, though it is a fine ambition
        // to retrieve the X-PrefLabel it cannot be seen because the 303 redirect
        // it is attached to is processed automatically by the browser and we
        // find ourselves looking at the final response.
        return $.ajax({
          type: 'GET',
          url: uri,
          beforeSend: function(xhr) {
            var j, len1, pair, results1;
//console.log(xhr)
            results1 = [];
            for (j = 0, len1 = sendHeaders.length; j < len1; j++) {
              pair = sendHeaders[j];
              //xhr.setRequestHeader('X-Test-Header', 'test-value')
              results1.push(xhr.setRequestHeader(pair[0], pair[1]));
            }
            return results1;
          },
          //xhr.setRequestHeader('Accept', "text/n-triples, text/x-turtle, */*")
          //headers:
          //  Accept: "text/n-triples, text/x-turtle, */*"
          success: (data, textStatus, request) => {
            var header, j, len1, line, results1, val;
            console.log(textStatus);
            console.log(request.getAllResponseHeaders());
            console.table((function() {
              var j, len1, ref, results1;
              ref = request.getAllResponseHeaders().split("\n");
              results1 = [];
              for (j = 0, len1 = ref.length; j < len1; j++) {
                line = ref[j];
                results1.push(line.split(':'));
              }
              return results1;
            })());
            results1 = [];
            for (j = 0, len1 = digestHeaders.length; j < len1; j++) {
              header = digestHeaders[j];
              val = request.getResponseHeader(header);
              if (val != null) {
                results1.push(alert(val));
              } else {
                results1.push(void 0);
              }
            }
            return results1;
          }
        });
      }

      discovery_triple_ingestor_N3(data, textStatus, request, discoArgs) {
        var parser, quadMunger, quadTester, quad_count;
        // Purpose:
        //   THIS IS NOT YET IN USE.  THIS IS FOR WHEN WE SWITCH OVER TO N3

        //   This is the XHR callback returned by @make_triple_ingestor()
        //   The assumption is that data will be something N3 can parse.
        // Accepts:
        //   discoArgs:
        //     quadTester (OPTIONAL)
        //       returns true if the quad is to be added
        //     quadMunger (OPTIONAL)
        //       returns an array of one or more quads inspired by each quad
        if (discoArgs == null) {
          discoArgs = {};
        }
        quadTester = discoArgs.quadTester || (q) => {
          return q != null;
        };
        quadMunger = discoArgs.quadMunger || (q) => {
          return [q];
        };
        quad_count = 0;
        parser = N3.Parser();
        return parser.parse(data, (err, quad, pref) => {
          var aQuad, j, len1, ref, results1;
          if (err && (discoArgs.onErr != null)) {
            discoArgs.onErr(err);
          }
          if (quadTester(quad)) {
            ref = quadMunger(quad);
            results1 = [];
            for (j = 0, len1 = ref.length; j < len1; j++) {
              aQuad = ref[j];
              results1.push(this.inject_discovered_quad_for(quad, discoArgs.aUrl));
            }
            return results1;
          }
        });
      }

      discovery_triple_ingestor_GreenTurtle(data, textStatus, request, discoArgs) {
        var aQuad, dataset, frame, graphUri, j, len1, len2, o, obj, pred, pred_id, quad, quadMunger, quadTester, ref, ref1, ref2, ref3, subj_uri;
        // Purpose:
        //   This is the XHR callback returned by @make_triple_ingestor()
        //   The assumption is that data will be something N3 can parse.
        // Accepts:
        //   discoArgs:
        //     quadTester (OPTIONAL)
        //       returns true if the quad is to be added
        //     quadMunger (OPTIONAL)
        //       returns an array of one or more quads inspired by each quad
        if (discoArgs == null) {
          discoArgs = {};
        }
        graphUri = discoArgs.graphUri;
        quadTester = discoArgs.quadTester || (q) => {
          return q != null;
        };
        quadMunger = discoArgs.quadMunger || (q) => {
          return [q];
        };
        dataset = new GreenerTurtle().parse(data, "text/turtle");
        ref = dataset.subjects;
        for (subj_uri in ref) {
          frame = ref[subj_uri];
          ref1 = frame.predicates;
          for (pred_id in ref1) {
            pred = ref1[pred_id];
            ref2 = pred.objects;
            for (j = 0, len1 = ref2.length; j < len1; j++) {
              obj = ref2[j];
              quad = {
                s: frame.id,
                p: pred.id,
                o: obj, // keys: type,value[,language]
                g: graphUri
              };
              if (quadTester(quad)) {
                ref3 = quadMunger(quad);
                for (o = 0, len2 = ref3.length; o < len2; o++) {
                  aQuad = ref3[o];
                  this.inject_discovered_quad_for(aQuad, discoArgs.aUrl);
                }
              }
            }
          }
        }
      }

      make_triple_ingestor(discoArgs) {
        return (data, textStatus, request) => {
          return this.discovery_triple_ingestor_GreenTurtle(data, textStatus, request, discoArgs);
        };
      }

      discover_labels(aUrl) {
        var discoArgs;
        discoArgs = {
          aUrl: aUrl,
          quadTester: (quad) => {
            var ref;
            if (quad.s !== aUrl.toString()) {
              return false;
            }
            if (!(ref = quad.p, indexOf.call(NAME_SYNS, ref) >= 0)) {
              return false;
            }
            return true;
          },
          quadMunger: (quad) => {
            return [quad];
          },
          graphUri: aUrl.origin
        };
        return this.make_triple_ingestor(discoArgs);
      }

      ingest_quads_from(uri, success, failure) {
        return $.ajax({
          type: 'GET',
          url: uri,
          success: success,
          failure: failure
        });
      }

      set_setting(inputName, newVal) {
        var input;
        input = this.topJQElem.find(`input[name='${inputName}']`);
        input.val(newVal);
        if (this[inputName] != null) {
          this[inputName] = newVal;
        }
        return newVal;
      }

      countdown_setting(inputName) {
        var input, newVal;
        input = this.topJQElem.find(`input[name='${inputName}']`);
        if (input.val() < 1) {
          return 0;
        }
        newVal = input.val() - 1;
        return this.set_setting(inputName, newVal);
      }

      preset_discover_geonames_remaining() {
        var count, j, len1, node, ref, url;
        count = 0;
        ref = this.nameless_set;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          node = ref[j];
          url = node.id;
          if (url.includes('sws.geonames.org')) {
            count++;
          }
        }
        return this.set_setting('discover_geonames_remaining', count);
      }

      show_geonames_instructions(params) {
        var args, markdown;
        //params =
        //  msg: "Check your email for confirmation msg"
        // Usage:
        //   show_geonames_instructions({msg:'Check your email for confirmation message.'})
        args = {
          width: this.width * 0.6,
          height: this.height * 0.6
        };
        markdown = this.discover_geoname_name_instructions_md;
        if (params != null) {
          if (params.msg != null) {
            markdown += `        \n#### Error:\n<span style="color:red">${params.msg}</span>`;
          }
        }
        return this.make_markdown_dialog(markdown, null, args);
      }

      discover_geoname_name(aUrl) {
        var id, idInt, k2p, rem, url, userId, widget;
        id = aUrl.pathname.replace(/\//g, '');
        idInt = parseInt(id);
        userId = this.discover_geonames_as;
        k2p = this.discover_geoname_key_to_predicate_mapping;
        url = `http://api.geonames.org/hierarchyJSON?geonameId=${id}&username=${userId}`;
        if (this.discover_geonames_remaining < 1) {
          return;
        }
        //console.warn("discover_geoname_name() should not be called when remaining is less than 1")
        if ((widget = this.discover_geonames_as__widget)) {
          if (widget.state === 'untried') {
            this.discover_geonames_as__widget.set_state('trying');
          } else if (widget.state === 'looking') {
            if (this.discover_geonames_remaining < 1) {
              console.info('stop looking because remaining is', this.discover_geonames_remaining);
              return false;
            }
            // We decrement remaining before looking or after successfully trying.
            // We do so before looking because we know that the username is good, so this will count.
            // We do so after trying because we do not know until afterward that the username was good and whether it would count.
            rem = this.countdown_setting('discover_geonames_remaining');
          //console.info('discover_geoname_name() widget.state =', widget.state, "so decrementing remaining (#{rem}) early")
          } else if (widget.state === 'good') {
            if (this.discover_geonames_remaining < 1) {
              //console.info('aborting discover_geoname_name() because remaining =', @discover_geonames_remaining)
              return false;
            }
            this.discover_geonames_as__widget.set_state('looking');
            console.info('looking for', id, 'using name', userId);
          } else {
            console.warn("discover_goename_name() should not be called when widget.state =", widget.state);
            return false;
          }
        }
        if (this.geonames_name_lookups_performed == null) {
          this.geonames_name_lookups_performed = 0;
        }
        this.geonames_name_lookups_performed += 1;
        $.ajax({
          url: url,
          error: (xhr, status, error) => {
            //console.log(xhr, status, error)
            if (error === 'Unauthorized') {
              if (this.discover_geonames_as__widget.state !== 'bad') {
                this.discover_geonames_as__widget.set_state('bad');
                return this.show_geonames_instructions();
              }
            }
          },
          success: (json, textStatus, request) => {
            var again, containershipQuad, deeperQuad, deeply, depth, geoNamesRoot, geoRec, greedily, j, key, msg, name, placeQuad, pred, quad, ref, seen_name, soughtGeoname, state_at_start, subj, theType, value;
            if (json.status) {
              if (this.discover_geoname_name_msgs == null) {
                this.discover_geoname_name_msgs = {};
              }
              if (json.status.message) {
                msg = `<dt style="font-size:.9em;color:red">${json.status.message}</dt>` + this.discover_geoname_name_instructions;
                if (userId) {
                  msg = `${userId} ${msg}`;
                }
              }
              if ((!this.discover_geoname_name_msgs[msg]) || (this.discover_geoname_name_msgs[msg] && Date.now() - this.discover_geoname_name_msgs[msg] > this.discover_geoname_name_msgs_threshold_ms)) {
                this.discover_geoname_name_msgs[msg] = Date.now();
                this.make_dialog(msg);
              }
              return;
            }
            //subj = aUrl.toString()
            //@show_state_msg(msg)
            if ((widget = this.discover_geonames_as__widget)) {
              state_at_start = widget.state;
              if (state_at_start === 'trying' || state_at_start === 'looking') {
                //rem = @countdown_setting('discover_geonames_remaining')
                //console.log('discover_geonames_remaining',rem,"after looking up",id)
                //@countdown_setting('discover_geonames_remaining') # decrement now because we just used one up for this account
                if (widget.state === 'trying') {
                  // we decrement remaining after successfully trying or before looking
                  this.countdown_setting('discover_geonames_remaining');
                  this.discover_geonames_as__widget.set_state('looking'); // more remaining, go straight to looking
                }
                if (widget.state === 'looking') {
                  if (this.discover_geonames_remaining > 0) {
                    // trigger again because they have been suspended
                    // use setTimeout to give nodes a chance to update
                    again = () => {
                      return this.discover_names('sws.geonames.org');
                    };
                    setTimeout(again, 100);
                  } else {
                    this.discover_geonames_as__widget.set_state('good'); // no more remaining lookups permitted
                // TODO figure out why setting 'good' only when done (and setting 'looking' while 'trying') hangs
                  }
                } else {
                  console.log('we should never get here where widget.state =', widget.state);
                }
              } else {
                //@discover_geonames_as__widget.set_state('good') # finally go to good because we are done
                msg = `state_at_start = ${state_at_start} but it should only be looking or trying (nameless: ${this.nameless_set.length})`;
              }
            }
            //console.error(msg)
            //throw new Error(msg)
            geoNamesRoot = aUrl.origin;
            deeperQuad = null;
            greedily = this.discover_geonames_greedily;
            deeply = this.discover_geonames_deeply;
            depth = 0;
            ref = json.geonames;
            // from most specific to most general
            for (j = ref.length - 1; j >= 0; j += -1) {
              geoRec = ref[j];
              subj = geoNamesRoot + '/' + geoRec.geonameId + '/';
              //console.log("discover_geoname_name(#{subj})")
              depth++;
              soughtGeoname = geoRec.geonameId === idInt;
              if ((!deeply) && (!soughtGeoname)) {
                //console.error("skipping because we are not going deep",geoRec.geonameId, id, geoRec.name)
                continue;
              }
              //console.table([{id: id, geonameId: geoRec.geonameId, name: geoRec.name}])
              name = (geoRec || {}).name;
              placeQuad = {
                s: subj,
                p: RDF_type,
                o: {
                  value: 'https://schema.org/Place',
                  type: RDF_object // REVIEW are there others?
                },
                g: geoNamesRoot
              };
              this.inject_discovered_quad_for(placeQuad, aUrl);
              seen_name = false;
// climb the hierarchy of Places sent by GeoNames
              for (key in geoRec) {
                value = geoRec[key];
                if (key === 'name') {
                  seen_name = true; // so we can break at the end of this loop being done
                } else {
                  if (!greedily) {
                    continue;
                  }
                }
                if (key === 'geonameId') {
                  continue;
                }
                pred = k2p[key];
                if (!pred) {
                  continue;
                }
                theType = RDF_literal;
                if (typeof value === 'number') {
                  // REVIEW are these right?
                  if (Number.isInteger(value)) {
                    theType = 'xsd:integer';
                  } else {
                    theType = 'xsd:decimal';
                  }
                  value = "" + value; // convert to string for @add_quad()
                } else {
                  theType = RDF_literal;
                }
                quad = {
                  s: subj,
                  p: pred,
                  o: {
                    value: value,
                    type: theType // REVIEW are there others?
                  },
                  g: geoNamesRoot
                };
                this.inject_discovered_quad_for(quad, aUrl);
                if (!greedily && seen_name) {
                  break; // out of the greedy consumption of all k/v pairs
                }
              }
              if (!deeply && depth > 1) {
                break; // out of the deep consumption of all nested contexts
              }
              if (deeperQuad) {
                containershipQuad = {
                  s: quad.s,
                  p: 'http://data.ordnancesurvey.co.uk/ontology/spatialrelations/contains',
                  o: {
                    value: deeperQuad.s,
                    type: RDF_object
                  },
                  g: geoNamesRoot
                };
                this.inject_discovered_quad_for(containershipQuad, aUrl);
              }
              deeperQuad = Object.assign({}, quad); // shallow copy
            // from success
            }
          }
        });
      }

      inject_discovered_quad_for(quad, url) {
        var q;
        // Purpose:
        //   Central place to perform operations on discoveries, such as caching.
        q = this.add_quad(quad);
        this.update_set_counts();
        if (this.found_names == null) {
          this.found_names = [];
        }
        return this.found_names.push(quad.o.value);
      }

      deprefix(uri, prefix, expansion) {
        // Return uri replacing expansion with prefix if possible
        return uri.replace(expansion, prefix);
      }

      make_sqarql_name_for_getty(uris, expansion, prefix) {
        var subj_constraint, uri;
        // This is good stuff which should be made a bit more general
        // for applicability beyond getty.edu
        //   see https://github.com/cwrc/HuViz/issues/180#issuecomment-489557605
        if (prefix == null) {
          prefix = ':';
        }
        if (!Array.isArray(uris)) {
          uris = [uris];
        }
        if (!uris.length) {
          throw new Error('expecting uris to be an Array of length > 0');
        }
        if (uris.length === 1) { // so just match that one uri directly
          subj_constraint = `BIND (?s AS <${uris[0]
// more than 1 so make a FILTER statement for the ?subj match
}>)`;
        } else {
          // Build a constraint for the subject
          //   FILTER (?subj IN (:300073730, :300153822, :300153825))
          subj_constraint = "FILTER (?s IN (" + ((function() {
            var j, len1, results1;
            results1 = [];
            for (j = 0, len1 = uris.length; j < len1; j++) {
              uri = uris[j];
              results1.push(this.deprefix(uri, prefix, expansion));
            }
            return results1;
          }).call(this)).join(', ') + "))";
        }
        return `PREFIX ${prefix} <${expansion}>\nSELECT * {\n  ?subj gvp:prefLabelGVP [xl:literalForm ?label] .\n  ${subj_constraint
// """
}\n }`;
      }

      auto_discover_name_for(uri) {
        var aUrl, e, ref, retval;
        if (uri.startsWith('_')) { // skip "blank" nodes
          return;
        }
        try {
          aUrl = new URL(uri);
        } catch (error1) {
          e = error1;
          colorlog(`skipping auto_discover_name_for('${uri}') because`);
          console.log(e);
          return;
        }
        if (uri.startsWith("http://id.loc.gov/")) {
          // This is less than ideal because it uses the special knowledge
          // that the .skos.nt file is available. Unfortunately the only
          // RDF file which is offered via content negotiation is .rdf and
          // there is no parser for that in HuViz yet.  Besides, they are huge.
          retval = this.ingest_quads_from(`${uri}.skos.nt`, this.discover_labels(uri));
        }
        //@auto_discover_header(uri, ['X-PrefLabel'], sendHeaders or [])
        //for expansion in ["http://vocab.getty.edu/aat/", "http://vocab.getty.edu/ontology#"]
        //  # Work was stopped on this when I realized that the CWRC ontology is no
        //  # longer referencing Getty.  It is still good stuff, but should be deprioritized
        //  # pending review.
        //  if uri.startsWith(expansion) # TODO can this be more general? ie shorter?
        //    sparql = @make_sparql_name_for_getty(uri, expansion)
        //    @ingest_quads_from_sparql(sparql) # TODO this is not yet implemented
        if (uri.startsWith("http://sws.geonames.org/") && ((ref = this.discover_geonames_as__widget.state) === 'untried' || ref === 'looking' || ref === 'good') && this.discover_geonames_remaining > 0) {
          this.discover_geoname_name(aUrl);
        }
      }

      ingest_quads_from_sparql(sparql) {
        return console.info(sparql);
      }

      discover_names_including(includes) {
        if (this.nameless_set) { // this might be before the set exists
          this.discover_names(includes);
        }
      }

      discover_names(includes) {
        var j, len1, node, ref, url;
        ref = this.nameless_set;
        //console.log('discover_names(',includes,') # of nameless:',@nameless_set.length)
        for (j = 0, len1 = ref.length; j < len1; j++) {
          node = ref[j];
          url = node.id;
          if (!((includes != null) && !url.includes(includes))) {
            // only if includes is specified but not found do we skip auto_discover_name_for
            this.auto_discover_name_for(node.id);
          }
        }
      }

      make_qname(uri) {
        // TODO(smurp) dear god! this method name is lying (it is not even trying)
        return uri;
      }

      add_quad(quad, sprql_subj) { //sprq_sbj only used in SPARQL quieries
        var cntx_n, ctxid, edge, isLiteral, is_type, literal_node, make_edge, newsubj, objId, objId_explanation, objKey, objVal, obj_n, pred_n, pred_uri, simpleType, subj, subj_lid, subj_n, subj_uri, use_thumb;
        // FIXME Oh! How this method needs a fine toothed combing!!!!
        //   * are rdf:Class and owl:Class the same?
        //   * uniquer is misnamed, it should be called make_domsafe_id or sumut
        //   * vars like sid, pid, subj_lid should be revisited
        //   * review subj vs subj_n
        //   * do not conflate node ids across prefixes eg rdfs:Class vs owl:Class
        //   * Literal should not be a subclass of Thing. Thing and dataType are sibs
        // Terminology:
        //   A `lid` is a "local id" which is unique and a safe identifier for css selectors.
        //   This is in opposition to an `id` which is a synonym for uri (ideally).
        //   There is inconsistency in this usage, which should be cleared up.
        //   Proposed terms which SHOULD be used are:
        //     - *_curie             eg pred_curie='rdfs:label'
        //     - *_uri               eg subj_uri='http://sparql.cwrc.ca/ontology/cwrc#NaturalPerson'
        //     - *_lid: a "local id" eg subj_lid='atwoma'
        //console.log "HuViz.add_quad()", quad
        subj_uri = quad.s;
        pred_uri = quad.p;
        ctxid = quad.g || this.DEFAULT_CONTEXT;
        subj_lid = uniquer(subj_uri); // FIXME rename uniquer to make_dom_safe_id
        this.object_value_types[quad.o.type] = 1;
        this.unique_pids[pred_uri] = 1;
        newsubj = false;
        subj = null;
        //if @p_display then @performance_dashboard('add_quad')

        // REVIEW is @my_graph still needed and being correctly used?
        if (this.my_graph.subjects[subj_uri] == null) {
          newsubj = true;
          subj = {
            id: subj_uri,
            name: subj_lid,
            predicates: {}
          };
          this.my_graph.subjects[subj_uri] = subj;
        } else {
          subj = this.my_graph.subjects[subj_uri];
        }
        this.ensure_predicate_lineage(pred_uri);
        edge = null;
        subj_n = this.get_or_create_node_by_id(subj_uri);
        pred_n = this.get_or_create_predicate_by_id(pred_uri);
        cntx_n = this.get_or_create_context_by_id(ctxid);
        if (quad.p === RDF_subClassOf && this.show_class_instance_edges) {
          this.try_to_set_node_type(subj_n, 'Class');
        }
        // TODO: use @predicates_to_ignore instead OR rdfs:first and rdfs:rest
        if (pred_uri.match(/\#(first|rest)$/)) {
          console.warn(`add_quad() ignoring quad because pred_uri=${pred_uri}`, quad);
          return;
        }
        // set the predicate on the subject
        if (subj.predicates[pred_uri] == null) {
          subj.predicates[pred_uri] = {
            objects: []
          };
        }
        if (quad.o.type === RDF_object) {
          // The object is not a literal, but another resource with an uri
          // so we must get (or create) a node to represent it
          obj_n = this.get_or_create_node_by_id(quad.o.value);
          if (quad.o.value === RDF_Class && this.show_class_instance_edges) {
            // This weird operation is to ensure that the Class Class is a Class
            this.try_to_set_node_type(obj_n, 'Class');
          }
          if (quad.p === RDF_subClassOf && this.show_class_instance_edges) {
            this.try_to_set_node_type(obj_n, 'Class');
          }
          // We have a node for the object of the quad and this quad is relational
          // so there should be links made between this node and that node
          is_type = is_one_of(pred_uri, TYPE_SYNS);
          use_thumb = is_one_of(pred_uri, THUMB_PREDS) && this.show_thumbs_dont_graph;
          make_edge = this.show_class_instance_edges || !is_type && !use_thumb;
          if (is_type) {
            this.try_to_set_node_type(subj_n, quad.o.value);
          }
          if (use_thumb) {
            subj_n.__thumbnail = quad.o.value;
            this.develop(subj_n);
          }
          if (make_edge) {
            this.develop(subj_n); // both subj_n and obj_n should hatch for edge to make sense
            // REVIEW uh, how are we ensuring that the obj_n is hatching? should it?
            edge = this.get_or_create_Edge(subj_n, obj_n, pred_n, cntx_n);
            this.infer_edge_end_types(edge);
            edge.register_context(cntx_n);
            edge.color = this.gclui.predicate_picker.get_color_forId_byName(pred_n.lid, 'showing');
            this.add_edge(edge);
            this.develop(obj_n); // ie the quad.o is a literal
          }
        } else {
          if (is_one_of(pred_uri, NAME_SYNS)) {
            this.set_name(subj_n, quad.o.value.replace(/^\s+|\s+$/g, ''), quad.o.language);
            if (subj_n.embryo) {
              this.develop(subj_n); // might be ready now
          // the object is a literal other than name
            }
          } else {
            if (this.make_nodes_for_literals) {
              objVal = quad.o.value;
              simpleType = getTypeSignature(quad.o.type || '') || 'Literal';
              if (objVal == null) {
                throw new Error("missing value for " + JSON.stringify([subj_uri, pred_uri, quad.o]));
              }
              // Does the value have a language or does it contain spaces?
              //objValHasSpaces = (objVal.match(/\s/g)||[]).length > 0
              if (quad.o.language && this.group_literals_by_subj_and_pred) {
                // Perhaps an appropriate id for a literal "node" is
                // some sort of amalgam of the subject and predicate ids
                // for that object.
                // Why?  Consider the case of rdfs:comment.
                // If there are multiple literal object values on rdfs:comment
                // they are presumably different language versions of the same
                // text.  For them to end up on the same MultiString instance
                // they all have to be treated as names for a node with the same
                // id -- hence that id must be composed of the subj and pred ids.
                // Another perspective on this is that these are different comments
                // in different languages, so what suggests that they have anything
                // at all to do with one another?
                // Further, if (as is the case with these triples)
                //   Martineau_Harriet hasActivistInvolvementIn "_tariff reform_"
                //   Martineau_Harriet hasGenderedPoliticalActivity "_tariff reform_"
                // they SHOULD share the "_tariff reform_" node.

                // So, after all this (poorly stated commentary) the uneasy conclusion
                // is that if a literal value has a language associated with it then
                // all the alternate language literals associated with that same
                // subject/predicate combination will be treated as the same literal
                // node.
                objKey = `${subj_n.lid} ${pred_uri}`;
                objId = synthIdFor(objKey);
                objId_explanation = `synthIdFor('${objKey}') = ${objId}`;
                console.warn(objId_explanation);
              } else {
                objId = synthIdFor(objVal);
              }
              literal_node = this.get_or_create_node_by_id(objId, objVal, (isLiteral = true));
              this.try_to_set_node_type(literal_node, simpleType);
              literal_node.__dataType = quad.o.type;
              this.develop(literal_node);
              this.set_name(literal_node, quad.o.value, quad.o.language);
              edge = this.get_or_create_Edge(subj_n, literal_node, pred_n, cntx_n);
              this.infer_edge_end_types(edge);
              edge.register_context(cntx_n);
              edge.color = this.gclui.predicate_picker.get_color_forId_byName(pred_n.lid, 'showing');
              this.add_edge(edge);
              literal_node.fully_loaded = true; // for sparql quieries to flag literals as fully_loaded
            }
          }
        }
        // if SPARQL Endpoint loaded AND this is subject node then set current subject to true (i.e. fully loaded)
        if ((this.endpoint_loader != null) && this.endpoint_loader.value) {
          subj_n.fully_loaded = false; // all nodes default to not being fully_loaded
          //if subj_n.id is sprql_subj# if it is the subject node then is fully_loaded
          //  subj_n.fully_loaded = true
          if (subj_n.id === quad.subject) { // if it is the subject node then is fully_loaded
            subj_n.fully_loaded = true;
          }
        }
        this.last_quad = quad;
        this.pfm_count('add_quad');
        return edge;
      }

      remove_from_nameless(node) {
        var node_removed;
        if (node.nameless != null) {
          if (this.nameless_removals == null) {
            this.nameless_removals = 0;
          }
          this.nameless_removals++;
          node_removed = this.nameless_set.remove(node);
          if (node_removed !== node) {
            console.log("expecting", node_removed, "to have been", node);
          }
          //if @nameless_set.binary_search(node) > -1
          //  console.log("expecting",node,"to no longer be found in",@nameless_set)
          delete node.nameless_since;
        }
      }

      add_to_nameless(node) {
        var base1;
        if (node.isLiteral) {
          return;
        }
        // Literals cannot have names looked up.
        node.nameless_since = performance.now();
        if ((base1 = this.nameless_set).traffic == null) {
          base1.traffic = 0;
        }
        this.nameless_set.traffic++;
        this.nameless_set.add(node);
      }

      //@nameless_set.push(node) # REVIEW(smurp) why not .add()?????
      set_name(node, full_name, lang) {
        var len, perform_rename;
        // So if we set the full_name to null that is to mean that we have
        // no good idea what the name yet.
        perform_rename = () => {
          if (full_name != null) {
            if (!node.isLiteral) {
              this.remove_from_nameless(node);
            }
          } else {
            if (!node.isLiteral) {
              this.add_to_nameless(node);
            }
            full_name = node.lid || node.id;
          }
          if (typeof full_name === 'object') {
            // MultiString instances have constructor.name == 'String'
            // console.log(full_name.constructor.name, full_name)
            return node.name = full_name;
          } else {
            if (node.name) {
              return node.name.set_val_lang(full_name, lang);
            } else {
              return node.name = new MultiString(full_name, lang);
            }
          }
        };
        if (node.state && node.state.id === 'shelved') {
          // Alter calls the callback add_name in the midst of an operation
          // which is likely to move subj_n from its current position in
          // the shelved_set.  The shelved_set is the only one which is
          // sorted by name and as a consequence is the only one able to
          // be confused by the likely shift in alphabetic position of a
          // node.  For the sake of efficiency we "alter()" the position
          // of the node rather than do shelved_set.resort() after the
          // renaming.
          this.shelved_set.alter(node, perform_rename);
          this.tick("Tick in set_name");
        } else {
          perform_rename();
        }
        //node.name ?= full_name  # set it if blank
        len = this.truncate_labels_to;
        if (len == null) {
          alert("len not set");
        }
        if (len > 0) {
          node.pretty_name = node.name.substr(0, len); // truncate
        } else {
          node.pretty_name = node.name;
        }
        node.scroll_offset = 0;
      }

      scroll_pretty_name(node) {
        var limit, should_scroll, spacer, wrapped;
        if (this.truncate_labels_to >= node.name.length) {
          limit = node.name.length;
        } else {
          limit = this.truncate_labels_to;
        }
        should_scroll = limit > 0 && limit < node.name.length;
        if (!should_scroll) {
          return;
        }
        if (true) { // node.label_truncated_to
          spacer = this.scroll_spacer;
          if (!node.scroll_offset) {
            node.scroll_offset = 1;
          } else {
            node.scroll_offset += 1;
            if (node.scroll_offset > node.name.length + spacer.length) { //limit
              node.scroll_offset = 0;
            }
          }
          wrapped = "";
          while (wrapped.length < 3 * limit) {
            wrapped += node.name + spacer;
          }
          return node.pretty_name = wrapped.substr(node.scroll_offset, limit);
        }
      }

      // if node.pretty_name.length > limit
      //   alert("TOO BIG")
      // if node.pretty_name.length < 1
      //   alert("TOO SMALL")
      unscroll_pretty_name(node) {
        return this.set_name(node, node.name);
      }

      infer_edge_end_types(edge) {
        var domain_lid, ranges;
        if (edge.source.type == null) {
          edge.source.type = 'Thing';
        }
        if (edge.target.type == null) {
          edge.target.type = 'Thing';
        }
        // infer type of source based on the range of the predicate
        ranges = this.ontology.range[edge.predicate.lid];
        if (ranges != null) {
          this.try_to_set_node_type(edge.target, ranges[0]);
        }
        // infer type of source based on the domain of the predicate
        domain_lid = this.ontology.domain[edge.predicate.lid];
        if (domain_lid != null) {
          return this.try_to_set_node_type(edge.source, domain_lid);
        }
      }

      make_Edge_id(subj_n, obj_n, pred_n) {
        var a;
        return ((function() {
          var j, len1, ref, results1;
          ref = [subj_n, pred_n, obj_n];
          results1 = [];
          for (j = 0, len1 = ref.length; j < len1; j++) {
            a = ref[j];
            results1.push(a.lid);
          }
          return results1;
        })()).join(' ');
      }

      get_or_create_Edge(subj_n, obj_n, pred_n, cntx_n) {
        var edge, edge_id;
        edge_id = this.make_Edge_id(subj_n, obj_n, pred_n);
        edge = this.edges_by_id[edge_id];
        if (edge == null) {
          this.edge_count++;
          edge = new Edge(subj_n, obj_n, pred_n);
          this.edges_by_id[edge_id] = edge;
        }
        return edge;
      }

      add_edge(edge) {
        if (edge.id.match(/Universal$/)) {
          console.log("add", edge.id);
        }
        // TODO(smurp) should .links_from and .links_to be SortedSets? Yes. Right?
        this.add_to(edge, edge.source.links_from);
        this.add_to(edge, edge.target.links_to);
        return edge;
      }

      delete_edge(e) {
        this.remove_link(e.id);
        this.remove_from(e, e.source.links_from);
        this.remove_from(e, e.target.links_to);
        delete this.edges_by_id[e.id];
        return null;
      }

      try_to_set_node_type(node, type_uri) {
        var prev_type, type_lid;
        type_lid = uniquer(type_uri); // should ensure uniqueness
        if (!node._types) {
          node._types = [];
        }
        if (!(indexOf.call(node._types, type_lid) >= 0)) {
          node._types.push(type_lid);
        }
        prev_type = node.type;
        node.type = type_lid;
        if (prev_type !== type_lid) {
          return this.assign_types(node);
        }
      }

      parseAndShowTTLData(data, textStatus, callback) {
        var blurt_msg, context, e, every, frame, j, len1, msg, obj, parse_start_time, pred, pred_id, quad_count, ref, ref1, ref2, subj_uri;
        // modelled on parseAndShowNQStreamer
        //console.log("parseAndShowTTLData",data)
        parse_start_time = new Date();
        context = "http://universal.org";
        if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
          try {
            //console.log("GreenTurtle() started")
            //@G = new GreenerTurtle().parse(data, "text/turtle")
            this.G = new GreenerTurtle().parse(data, "text/turtle");
          } catch (error1) {
            e = error1;
            msg = escapeHtml(e.toString());
            blurt_msg = `<p>There has been a problem with the Turtle parser.  Check your dataset for errors.</p><p class="js_msg">${msg}</p>`;
            this.blurt(blurt_msg, "error");
            return false;
          }
        }
        quad_count = 0;
        every = this.report_every;
        ref = this.G.subjects;
        for (subj_uri in ref) {
          frame = ref[subj_uri];
          ref1 = frame.predicates;
          //console.log "frame:",frame
          //console.log frame.predicates
          for (pred_id in ref1) {
            pred = ref1[pred_id];
            ref2 = pred.objects;
            for (j = 0, len1 = ref2.length; j < len1; j++) {
              obj = ref2[j];
              // this is the right place to convert the ids (URIs) to CURIES
              //   Or should it be QNames?
              //      http://www.w3.org/TR/curie/#s_intro
              if (every === 1) {
                this.show_state_msg(`<LI>${frame.id} <LI>${pred.id} <LI>${obj.value}`);
                console.log("===========================\n  #", quad_count, "  subj:", frame.id, "\n  pred:", pred.id, "\n  obj.value:", obj.value);
              } else {
                if (quad_count % every === 0) {
                  this.show_state_msg("parsed relation: " + quad_count);
                }
              }
              quad_count++;
              this.add_quad({
                s: frame.id,
                p: pred.id,
                o: obj, // keys: type,value[,language]
                g: context
              });
            }
          }
        }
        this.dump_stats();
        return this.after_file_loaded('stream', callback);
      }

      dump_stats() {
        console.log("object_value_types:", this.object_value_types);
        return console.log("unique_pids:", this.unique_pids);
      }

      parseAndShowTurtle(data, textStatus) {
        var j, key, len1, msg, parse_end_time, parse_start_time, parse_time, parser, predicates, prop_name, prop_obj, ref, show_end_time, show_start_time, show_time, siz, value;
        msg = "data was " + data.length + " bytes";
        parse_start_time = new Date();
        if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
          this.G = new GreenerTurtle().parse(data, "text/turtle");
          console.log("GreenTurtle");
        } else if (this.turtle_parser === 'N3') {
          console.log("N3");
          //N3 = require('N3')
          console.log("n3", N3);
          predicates = {};
          parser = N3.Parser();
          parser.parse(data, (err, trip, pref) => {
            console.log(trip);
            if (pref) {
              console.log(pref);
            }
            if (trip) {
              return this.add_quad(trip);
            } else {
              return console.log(err);
            }
          });
          //console.log "my_graph",@my_graph
          console.log('===================================');
          ref = ['predicates', 'subjects', 'objects'];
          for (j = 0, len1 = ref.length; j < len1; j++) {
            prop_name = ref[j];
            prop_obj = this.my_graph[prop_name];
            console.log(prop_name, ((function() {
              var results1;
              results1 = [];
              for (key in prop_obj) {
                value = prop_obj[key];
                results1.push(key);
              }
              return results1;
            })()).length, prop_obj);
          }
          console.log('===================================');
        }
        //console.log "Predicates",(key for key,value of my_graph.predicates).length,my_graph.predicates
        //console.log "Subjects",my_graph.subjects.length,my_graph.subjects
        //console.log "Objects",my_graph.objects.length,my_graph.objects
        parse_end_time = new Date();
        parse_time = (parse_end_time - parse_start_time) / 1000;
        siz = this.roughSizeOfObject(this.G);
        msg += " resulting in a graph of " + siz + " bytes";
        msg += " which took " + parse_time + " seconds to parse";
        if (this.verbosity >= this.COARSE) {
          console.log(msg);
        }
        show_start_time = new Date();
        this.showGraph(this.G);
        show_end_time = new Date();
        show_time = (show_end_time - show_start_time) / 1000;
        msg += " and " + show_time + " sec to show";
        if (this.verbosity >= this.COARSE) {
          console.log(msg);
        }
        this.text_cursor.set_cursor("default");
        return $("#status").text("");
      }

      choose_everything() {
        var cmd;
        cmd = new gcl.GraphCommand(this, {
          verbs: ['choose'],
          classes: ['Thing']
        });
        this.gclc.run(cmd);
        return this.tick("Tick in choose_everything");
      }

      remove_framing_quotes(s) {
        return s.replace(/^\"/, "").replace(/\"$/, "");
      }

      parseAndShowNQStreamer(uri, callback) {
        var owl_type_map, quad_count, worker;
        // turning a blob (data) into a stream
        //   http://stackoverflow.com/questions/4288759/asynchronous-for-cycle-in-javascript
        //   http://www.dustindiaz.com/async-method-queues/
        owl_type_map = {
          uri: RDF_object,
          literal: RDF_literal
        };
        worker = new Worker('/huviz/xhr_readlines_worker.js');
        quad_count = 0;
        worker.addEventListener('message', (e) => {
          var msg, q;
          msg = null;
          if (e.data.event === 'line') {
            quad_count++;
            this.show_state_msg("<h3>Parsing... </h3><p>" + uri + "</p><progress value='" + quad_count + "' max='" + this.node_count + "'></progress>");
            //if quad_count % 100 is 0
            //@show_state_msg("parsed relation " + quad_count)
            q = parseQuadLine(e.data.line);
            if (q) {
              q.s = q.s.raw;
              q.p = q.p.raw;
              q.g = q.g.raw;
              q.o = {
                type: owl_type_map[q.o.type],
                value: unescape_unicode(this.remove_framing_quotes(q.o.toString()))
              };
              this.add_quad(q);
            }
          } else if (e.data.event === 'start') {
            msg = "starting to split " + uri;
            this.show_state_msg("<h3>Starting to split... </h3><p>" + uri + "</p>");
            this.node_count = e.data.numLines;
          } else if (e.data.event === 'finish') {
            msg = "finished_splitting " + uri;
            this.show_state_msg("done loading");
            this.after_file_loaded(uri, callback);
          } else {
            msg = "unrecognized NQ event:" + e.data.event;
          }
          if (msg != null) {
            return this.blurt(msg);
          }
        });
        return worker.postMessage({
          uri: uri
        });
      }

      parse_and_show_NQ_file(data, callback) {
        var allLines, j, len1, line, owl_type_map, q, quad_count;
        //TODO There is currently no error catcing on local nq files
        owl_type_map = {
          uri: RDF_object,
          literal: RDF_literal
        };
        quad_count = 0;
        allLines = data.split(/\r\n|\n/);
        for (j = 0, len1 = allLines.length; j < len1; j++) {
          line = allLines[j];
          quad_count++;
          q = parseQuadLine(line);
          if (q) {
            q.s = q.s.raw;
            q.p = q.p.raw;
            q.g = q.g.raw;
            q.o = {
              type: owl_type_map[q.o.type],
              value: unescape_unicode(this.remove_framing_quotes(q.o.toString()))
            };
            this.add_quad(q);
          }
        }
        this.local_file_data = "";
        return this.after_file_loaded('local file', callback);
      }

      DUMPER(data) {
        return console.log(data);
      }

      fetchAndShow(url, callback) {
        var msg, the_parser;
        this.show_state_msg("fetching " + url);
        the_parser = this.parseAndShowNQ; //++++Why does the parser default to NQ?
        if (url.match(/.ttl/)) {
          the_parser = this.parseAndShowTTLData; // does not stream
        } else if (url.match(/.(nq|nt)/)) {
          the_parser = this.parseAndShowNQ; //File not valid
        } else {
          //abort with message
          //NOTE This only catches URLs that do not have a valid file name; nothing about actual file format
          //else if url.match(/.json/) #Currently JSON files not supported at read_data_and_show
          //console.log "Fetch and show JSON File"
          //the_parser = @parseAndShowJSON
          msg = `Could not load ${url}. The data file format is not supported! ` + "Only files with TTL and NQ extensions are accepted.";
          this.hide_state_msg();
          this.blurt(msg, 'error');
          $('#' + this.get_data_ontology_display_id()).remove();
          this.reset_dataset_ontology_loader();
          return;
        }
        // Deal with the case that the file is cached inside the datasetDB as a result
        // of having been dragged and droppped from the local disk and added to the datasetDB.
        //@init_resource_menus()
        if (url.startsWith('file:///') || url.indexOf('/') === -1) { // ie it is a local file
          this.get_resource_from_db(url, (err, rsrcRec) => {
            if (rsrcRec != null) {
              the_parser(rsrcRec.data); // REVIEW ensure that proper try catch is happening
              return;
            }
            this.blurt(err || `'${url} was not found in your DATASET menu.  Provide it and reload this page`);
            this.reset_dataset_ontology_loader();
          });
          return;
        }
        if (the_parser === this.parseAndShowNQ) {
          this.parseAndShowNQStreamer(url, callback);
          return;
        }
        return $.ajax({
          url: url,
          success: (data, textStatus) => {
            the_parser(data, textStatus, callback);
            //@fire_fileloaded_event(url) ## should call after_file_loaded(url, callback) within the_parser
            return this.hide_state_msg();
          },
          error: (jqxhr, textStatus, errorThrown) => {
            console.log(url, errorThrown);
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching dataset " + url;
            this.hide_state_msg();
            $('#' + this.get_data_ontology_display_id()).remove();
            this.blurt(msg, 'error'); // trigger this by goofing up one of the URIs in cwrc_data.json
            return this.reset_dataset_ontology_loader();
          }
        });
      }

      //TODO Reset titles on page
      sparql_graph_query_and_show(url, id, callback) {
        var ajax_settings, graphSelector, qry, spinner;
        qry = "SELECT ?g\nWHERE {\n  GRAPH ?g { }\n}";
        /*
        Reference: https://www.w3.org/TR/sparql11-protocol/
        1. query via GET
        2. query via URL-encoded POST
        3. query via POST directly -- Query String Parameters: default-graph-uri (0 or more); named-graph-uri (0 or more)
                                   -- Request Content Type: application/sparql-query
                                   -- Request Message Body: Unencoded SPARQL query string
        */
        // These POST settings work for: CWRC, WWI open, on DBpedia, and Open U.K. but not on Bio Database
        ajax_settings = { //TODO Currently this only works on CWRC Endpoint
          'type': 'GET',
          'url': url + '?query=' + encodeURIComponent(qry),
          'headers': {
            //'Content-Type': 'application/sparql-query'  # This is only required for CWRC - not accepted by some Endpoints
            'Accept': 'application/sparql-results+json'
          }
        };
        if (url === "http://sparql.cwrc.ca/sparql") { // Hack to make CWRC setup work properly
          ajax_settings.headers = {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
          };
        }
        // These POST settings work for: CWRC and WWI open, but not on DBpedia and Open U.K.
        /*
        ajax_settings = {
          'type': 'POST'
          'url': url
          'data': qry
          'headers' :
        'Content-Type': 'application/sparql-query'
        'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
        }
        */
        /*
        ajax_settings = {
          'type': 'GET'
          'data': ''
          'url': url + '?query=' + encodeURIComponent(qry)
          'headers' :
        #'Accept': 'application/sparql-results+json'
        'Content-Type': 'application/x-www-form-urlencoded'
        'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
        }
         */
        //littleTestQuery = """SELECT * WHERE {?s ?o ?p} LIMIT 1"""
        /*
        $.ajax
          method: 'GET'
          url: url + '?query=' + encodeURIComponent(littleTestQuery)
          headers:
        'Accept': 'application/sparql-results+json'
          success: (data, textStatus, jqXHR) =>
        console.log "This a little repsponse test: " + textStatus
        console.log jqXHR
        console.log jqXHR.getAllResponseHeaders(data)
        console.log data
          error: (jqxhr, textStatus, errorThrown) =>
        console.log(url, errorThrown)
        console.log jqXHR.getAllResponseHeaders(data)
        */
        /*
         * This is a quick test of the SPARQL Endpoint it should return
         *   https://www.w3.org/TR/2013/REC-sparql11-service-description-20130321/#example-turtle
        $.ajax
          method: 'GET'
          url: url
          headers:
        'Accept': 'text/turtle'
          success: (data, textStatus, jqXHR) =>
        console.log "This Enpoint Test: " + textStatus
        console.log jqXHR
        console.log jqXHR.getAllResponseHeaders(data)
        console.log data
          error: (jqxhr, textStatus, errorThrown) =>
        console.log(url, errorThrown)
        console.log jqXHR.getAllResponseHeaders(data)
         */
        graphSelector = `#sparqlGraphOptions-${id}`;
        $(graphSelector).parent().css('display', 'none');
        this.sparqlQryInput_hide();
        spinner = $(`#sparqlGraphSpinner-${id}`);
        spinner.css('display', 'block');
        return $.ajax({
          type: ajax_settings.type,
          url: ajax_settings.url,
          headers: ajax_settings.headers,
          success: (data, textStatus, jqXHR) => {
            var graph, graph_options, graphsNotFound, j, json_check, json_data, len1, results;
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            results = json_data.results.bindings;
            graphsNotFound = jQuery.isEmptyObject(results[0]);
            if (graphsNotFound) {
              $(graphSelector).parent().css('display', 'none');
              this.reset_endpoint_form(true);
              return;
            }
            graph_options = `<option id='${this.unique_id()}' value='${url}'> All Graphs </option>`;
            for (j = 0, len1 = results.length; j < len1; j++) {
              graph = results[j];
              graph_options = graph_options + `<option id='${this.unique_id()}' value='${graph.g.value}'>${graph.g.value}</option>`;
            }
            $(`#sparqlGraphOptions-${id}`).html(graph_options);
            $(graphSelector).parent().css('display', 'block');
            return this.reset_endpoint_form(true);
          },
          error: (jqxhr, textStatus, errorThrown) => {
            var msg;
            console.log(url, errorThrown);
            console.log(jqXHR.getAllResponseHeaders(data));
            $(graphSelector).parent().css('display', 'none');
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + url;
            this.hide_state_msg();
            $('#' + this.get_data_ontology_display_id()).remove();
            this.blurt(msg, 'error'); // trigger this by goofing up one of the URIs in cwrc_data.json
            this.reset_dataset_ontology_loader();
            return spinner.css('visibility', 'hidden');
          }
        });
      }

      sparqlQryInput_hide() {
        return this.sparqlQryInput_JQElem.hide(); //css('display', 'none')
      }

      sparqlQryInput_show() {
        this.sparqlQryInput_JQElem.show();
        return this.sparqlQryInput_JQElem.css({
          'color': 'inherit'
        });
      }

      load_endpoint_data_and_show(subject, callback) {
        /*
        qry = """
        SELECT * #{fromGraph}
        WHERE {
        {<#{subject}> ?p ?o} UNION
        {{<#{subject}> ?p ?o} . {?o ?p2 ?o2 . FILTER(?o != <#{subject}>)}}
        }
        LIMIT #{node_limit}
        """
        */
        /*
        qry = """
        SELECT * #{fromGraph}
        WHERE {
        {<#{subject}> ?p ?o}
        UNION
        {{<#{subject}> ?p ?o} . {?o ?p2 ?o2 . FILTER(?o != <#{subject}>)}}
        UNION
        { ?s ?p <#{subject}>}
        }
        LIMIT #{node_limit}
        """
        */
        var ajax_settings, fromGraph, node_limit, qry, url;
        this.sparql_node_list = [];
        this.pfm_count('sparql');
        //if @p_display then @performance_dashboard('sparql_request')
        node_limit = this.endpoint_limit_JQElem.val();
        url = this.endpoint_loader.value;
        this.endpoint_loader.outstanding_requests = 0;
        fromGraph = '';
        if (this.endpoint_loader.endpoint_graph) {
          fromGraph = ` FROM <${this.endpoint_loader.endpoint_graph}> `;
        }
        qry = `SELECT * ${fromGraph}\nWHERE {\n  {<${subject}> ?p ?o}\n  UNION\n  {{<${subject}> ?p ?o} . {?o ?p2 ?o2}}\nUNION\n  {{?s3 ?p3 <${subject}>} . {?s3 ?p4 ?o4 }}\n}\nLIMIT ${node_limit}`;
        ajax_settings = {
          'method': 'GET', //'POST'
          'url': url + '?query=' + encodeURIComponent(qry),
          'headers': {
            'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
          }
        };
        if (url === "http://sparql.cwrc.ca/sparql") { // Hack to make CWRC setup work properly
          ajax_settings.headers = {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
          };
        }
        /*
        ajax_settings = {
          'method': 'POST'
          'url': url #+ '?query=' + encodeURIComponent(qry)
          'data': qry
          'headers' :
        'Content-Type': 'application/sparql-query'
        'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
        }
        */
        //console.log "URL: " + url + "  Graph: " + fromGraph + "  Subject: " + subject
        //console.log qry
        return $.ajax({
          method: ajax_settings.method,
          url: ajax_settings.url,
          headers: ajax_settings.headers,
          success: (data, textStatus, jqXHR) => {
            var disable, endpoint, json_check, json_data;
            //console.log jqXHR
            //console.log data
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            this.add_nodes_from_SPARQL(json_data, subject);
            endpoint = this.endpoint_loader.value;
            this.dataset_loader.disable();
            this.ontology_loader.disable();
            this.replace_loader_display_for_endpoint(endpoint, this.endpoint_loader.endpoint_graph);
            disable = true;
            this.update_go_button(disable);
            this.big_go_button.hide();
            return this.after_file_loaded('sparql', callback);
          },
          error: (jqxhr, textStatus, errorThrown) => {
            var msg;
            console.log(url, errorThrown);
            console.log(jqXHR.getAllResponseHeaders(data));
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + url;
            this.hide_state_msg();
            $('#' + this.get_data_ontology_display_id()).remove();
            this.blurt(msg, 'error'); // trigger this by goofing up one of the URIs in cwrc_data.json
            return this.reset_dataset_ontology_loader();
          }
        });
      }

      load_new_endpoint_data_and_show(subject, callback) { // DEPRECIATED !!!!
        var ajax_settings, fromGraph, node_limit, note, qry, url;
        node_limit = this.endpoint_limit_JQElem.val();
        this.p_total_sprql_requests++;
        note = '';
        url = this.endpoint_loader.value;
        fromGraph = '';
        if (this.endpoint_loader.endpoint_graph) {
          fromGraph = ` FROM <${this.endpoint_loader.endpoint_graph}> `;
        }
        qry = `SELECT * ${fromGraph}\nWHERE {\n{<${subject}> ?p ?o}\nUNION\n{{<${subject}> ?p ?o} . {?o ?p2 ?o2}}\nUNION\n{{?s3 ?p3 <${subject}>} . {?s3 ?p4 ?o4 }}\n}\nLIMIT ${node_limit}`;
        ajax_settings = {
          'method': 'GET', //'POST'
          'url': url + '?query=' + encodeURIComponent(qry),
          'headers': {
            'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
          }
        };
        if (url === "http://sparql.cwrc.ca/sparql") { // Hack to make CWRC setup work properly
          ajax_settings.headers = {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
          };
        }
        return $.ajax({
          method: ajax_settings.method,
          url: ajax_settings.url,
          headers: ajax_settings.headers,
          success: (data, textStatus, jqXHR) => {
            var json_check, json_data;
            //console.log jqXHR
            //console.log "Query: " + subject
            note = subject;
            if (this.p_display) {
              this.performance_dashboard('sparql_request', note);
            }
            //console.log qry
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            //console.log "Json Array Size: " + json_data.results.bindings.length
            this.add_nodes_from_SPARQL(json_data, subject);
            this.shelved_set.resort();
            this.tick("Tick in load_new_endpoint_data_and_show success callback");
            this.update_all_counts();
            return this.endpoint_loader.outstanding_requests = this.endpoint_loader.outstanding_requests - 1;
          },
          //console.log "Finished request: count now " + @endpoint_loader.outstanding_requests
          error: (jqxhr, textStatus, errorThrown) => {
            var msg;
            console.log(url, errorThrown);
            console.log(jqXHR.getAllResponseHeaders(data));
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + url;
            this.hide_state_msg();
            $('#' + this.get_data_ontology_display_id()).remove();
            this.blurt(msg, 'error'); // trigger this by goofing up one of the URIs in cwrc_data.json
            return this.reset_dataset_ontology_loader();
          }
        });
      }

      add_nodes_from_SPARQL(json_data, subject) { // DEPRECIATED !!!!
        var a_node, context, data, i, j, language, len1, len2, len3, node, node_list_empty, node_not_in_list, nodes_in_data, o, obj_type, obj_val, p, plainLiteral, pred, q, ref, ref1, results1, snode, subj;
        data = '';
        context = "http://universal.org";
        plainLiteral = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
        //console.log json_data
        console.log("Adding node (i.e. fully exploring): " + subject);
        nodes_in_data = json_data.results.bindings;
        results1 = [];
        for (j = 0, len1 = nodes_in_data.length; j < len1; j++) {
          node = nodes_in_data[j];
          language = '';
          obj_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
          if (node.s) {
            subj = node.s.value;
            pred = node.p.value;
            obj_val = subject;
          } else if (node.o2) {
            subj = node.o.value;
            pred = node.p2.value;
            obj_val = node.o2.value;
            if (node.o2.type === 'literal' || node.o.type === 'typed-literal') {
              if (node.o2.datatype) {
                obj_type = node.o2.datatype;
              } else {
                obj_type = plainLiteral;
              }
              if (node.o2["xml:lang"]) {
                language = node.o2['xml:lang'];
              }
            }
          //console.log "-------- Sub-node -----" + subj + " " + pred  + " " + obj_val + " " + obj_type
          } else if (node.s3) {
            subj = node.s3.value;
            pred = node.p4.value;
            obj_val = node.o4.value;
            if (node.o4.type === 'literal' || node.o4.type === 'typed-literal') {
              if (node.o4.datatype) {
                obj_type = node.o4.datatype;
              } else {
                obj_type = plainLiteral;
              }
              if (node.o4["xml:lang"]) {
                language = node.o4['xml:lang'];
              }
            }
          } else {
            subj = subject;
            pred = node.p.value;
            obj_val = node.o.value;
            if (node.o.type === 'literal' || node.o.type === 'typed-literal') {
              if (node.o.datatype) {
                obj_type = node.o.datatype;
              } else {
                obj_type = plainLiteral;
              }
              if (node.o["xml:lang"]) {
                language = node.o['xml:lang'];
              }
            }
          }
          q = {
            g: context,
            s: subj,
            p: pred,
            o: {
              type: obj_type,
              value: obj_val
            }
          };
          if (language) {
            q.o.language = language;
          }
          //console.log q
          //IF this is a new quad, then add it. Otherwise no.
          node_list_empty = this.sparql_node_list.length;
          if (node_list_empty === 0) { // Add first node (because list is empty)
            this.sparql_node_list.push(q);
            node_not_in_list = true;
          } else {
            ref = this.sparql_node_list;
            // Check if node is in list - sparql_node_list is used to keep track of nodes that have already been
            // loaded by a query so that they will not be added again through add_quad.
            for (o = 0, len2 = ref.length; o < len2; o++) {
              snode = ref[o];
              //TODO - This filtering statement doesn't seem tight (Will not catch nodes that HuViz creates - that's okay I think)
              if (q.s === snode.s && q.p === snode.p && q.o.value === snode.o.value && q.o.type === snode.o.type && q.o.language === snode.o.language) {
                node_not_in_list = false;
                //console.log "Found it in list so will not send to add_quad"
                if (snode.s === subject || snode.o.value === subject) { //IF node is subject node IS already in list BUT fullly_loaded is false then set to true
                  ref1 = this.all_set;
                  for (i = p = 0, len3 = ref1.length; p < len3; i = ++p) {
                    a_node = ref1[i];
                    if (a_node.id === subject) {
                      this.all_set[i].fully_loaded = true;
                    }
                  }
                }
                //console.log "Found node for #{subject} so making it fully_loaded"
                //else if snode.o.value is subject
                //for a_node, i in @all_set
                //console.log "compare: " + a_node.id + "   subject: " + subject
                //if a_node.id is subject
                //@all_set[i].fully_loaded = true
                //console.log "Found object node for #{subject} which should be fully_loaded"
                break;
              } else {
                node_not_in_list = true;
              }
            }
          }
          //If node is not in list then add
          if (node_not_in_list) {
            this.sparql_node_list.push(q);
            node_not_in_list = false;
            results1.push(this.add_quad(q, subject));
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }

      //@dump_stats()
      add_nodes_from_SPARQL_Worker(queryTarget) {
        var graph, local_node_added, previous_nodes, query_limit, url, worker;
        console.log("Make request for new query and load nodes");
        this.pfm_count('sparql');
        url = this.endpoint_loader.value;
        if (this.sparql_node_list) {
          previous_nodes = this.sparql_node_list;
        } else {
          previous_nodes = [];
        }
        graph = this.endpoint_loader.endpoint_graph;
        local_node_added = 0;
        query_limit = 1000; //@endpoint_limit_JQElem.val()
        worker = new Worker('/huviz/sparql_ajax_query.js');
        worker.addEventListener('message', (e) => {
          var a_node, add_fully_loaded, i, j, len1, len2, o, quad, ref, ref1;
          //console.log e.data
          add_fully_loaded = e.data.fully_loaded_index;
          ref = e.data.results;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            quad = ref[j];
            //console.log quad
            this.add_quad(quad);
            this.sparql_node_list.push(quad); // Add the new quads to the official list of added quads
            local_node_added++;
          }
          console.log("Node Added Count: " + local_node_added);
          ref1 = this.all_set;
          // Verify through the loaded nodes that they are all properly marked as fully_loaded
          for (i = o = 0, len2 = ref1.length; o < len2; i = ++o) {
            a_node = ref1[i];
            if (a_node.id === queryTarget) {
              this.all_set[i].fully_loaded = true;
            }
          }
          this.endpoint_loader.outstanding_requests = this.endpoint_loader.outstanding_requests - 1;
          console.log("Resort the shelf");
          this.shelved_set.resort();
          this.tick("Tick in add_nodes_from_SPARQL_worker");
          return this.update_all_counts();
        });
        return worker.postMessage({
          target: queryTarget,
          url: url,
          graph: graph,
          limit: query_limit,
          previous_nodes: previous_nodes
        });
      }

      // Deal with buggy situations where flashing the links on and off
      // fixes data structures.  Not currently needed.
      show_and_hide_links_from_node(d) {
        this.show_links_from_node(d);
        return this.hide_links_from_node(d);
      }

      get_container_width(pad) {
        var tabs_width, w_width;
        pad = pad || hpad;
        w_width = (this.container.clientWidth || window.innerWidth || document.documentElement.clientWidth || document.clientWidth) - pad;
        tabs_width = 0;
        if (this.tabsJQElem && this.tabsJQElem.length > 0) {
          tabs_width = this.tabsJQElem.width();
        }
        return this.width = w_width - tabs_width;
      }

      // Should be refactored to be get_container_height
      get_container_height(pad) {
        pad = pad || hpad;
        this.height = (this.container.clientHeight || window.innerHeight || document.documentElement.clientHeight || document.clientHeight) - pad;
        if (this.args.stay_square) {
          this.height = this.width;
        }
        return this.height;
      }

      update_graph_radius() {
        this.graph_region_radius = Math.floor(Math.min(this.width / 2, this.height / 2));
        return this.graph_radius = this.graph_region_radius * this.shelf_radius;
      }

      update_graph_center() {
        this.cy = this.height / 2;
        if (this.off_center) {
          this.cx = this.width - this.graph_region_radius;
        } else {
          this.cx = this.width / 2;
        }
        this.my = this.cy * 2;
        return this.mx = this.cx * 2;
      }

      update_lariat_zone() {
        return this.lariat_center = [this.cx, this.cy];
      }

      update_discard_zone() {
        this.discard_ratio = .1;
        this.discard_radius = this.graph_radius * this.discard_ratio;
        return this.discard_center = [this.width - this.discard_radius * 3, this.height - this.discard_radius * 3];
      }

      set_search_regex(text) {
        return this.search_regex = new RegExp(text || "^$", "ig");
      }

      update_searchterm() {
        var text;
        text = $(this).text();
        this.set_search_regex(text);
        return this.restart();
      }

      dump_locations(srch, verbose, func) {
        var pattern;
        verbose = verbose || false;
        pattern = new RegExp(srch, "ig");
        return nodes.forEach((node, i) => {
          if (!node.name.match(pattern)) {
            if (verbose) {
              console.log(pattern, "does not match!", node.name);
            }
            return;
          }
          if (func) {
            console.log(func.call(node));
          }
          if (!func || verbose) {
            return this.dump_details(node);
          }
        });
      }

      get_node_by_id(node_id, throw_on_fail) {
        var obj;
        throw_on_fail = throw_on_fail || false;
        obj = this.nodes.get_by('id', node_id);
        if ((obj == null) && throw_on_fail) {
          throw new Error("node with id <" + node_id + "> not found");
        }
        return obj;
      }

      update_showing_links(n) {
        var old_status;
        // TODO understand why this is like {Taxon,Predicate}.update_state
        //   Is this even needed anymore?
        old_status = n.showing_links;
        if (n.links_shown.length === 0) {
          n.showing_links = "none";
        } else {
          if (n.links_from.length + n.links_to.length > n.links_shown.length) {
            n.showing_links = "some";
          } else {
            n.showing_links = "all";
          }
        }
        if (old_status === n.showing_links) {
          return null; // no change, so null
        }
        // We return true to mean that edges where shown, so
        return old_status === "none" || n.showing_links === "all";
      }

      should_show_link(edge) {
        var d, e, ss, ts;
        // Edges should not be shown if either source or target are discarded or embryonic.
        ss = edge.source.state;
        ts = edge.target.state;
        d = this.discarded_set;
        e = this.embryonic_set;
        return !(ss === d || ts === d || ss === e || ts === e);
      }

      add_link(e) {
        this.add_to(e, e.source.links_from);
        this.add_to(e, e.target.links_to);
        if (this.should_show_link(e)) {
          this.show_link(e);
        }
        this.update_showing_links(e.source);
        this.update_showing_links(e.target);
        return this.update_state(e.target);
      }

      remove_link(edge_id) {
        var e;
        e = this.links_set.get_by('id', edge_id);
        if (e == null) {
          console.log(`remove_link(${edge_id}) not found!`);
          return;
        }
        this.remove_from(e, e.source.links_shown);
        this.remove_from(e, e.target.links_shown);
        this.links_set.remove(e);
        console.log("removing links from: " + e.id);
        this.update_showing_links(e.source);
        this.update_showing_links(e.target);
        this.update_state(e.target);
        return this.update_state(e.source);
      }

      // FIXME it looks like incl_discards is not needed and could be removed
      show_link(edge, incl_discards) {
        if ((!incl_discards) && (edge.target.state === this.discarded_set || edge.source.state === this.discarded_set)) {
          return;
        }
        this.add_to(edge, edge.source.links_shown);
        this.add_to(edge, edge.target.links_shown);
        this.links_set.add(edge);
        edge.show();
        this.update_state(edge.source);
        return this.update_state(edge.target);
      }

      //@gclui.add_shown(edge.predicate.lid,edge)
      unshow_link(edge) {
        this.remove_from(edge, edge.source.links_shown);
        this.remove_from(edge, edge.target.links_shown);
        this.links_set.remove(edge);
        //console.log("unshowing links from: " + edge.id)
        edge.unshow(); // FIXME make unshow call @update_state WHICH ONE? :)
        this.update_state(edge.source);
        return this.update_state(edge.target);
      }

      //@gclui.remove_shown(edge.predicate.lid,edge)
      show_links_to_node(n, incl_discards) {
        incl_discards = incl_discards || false;
        //if not n.links_to_found
        //  @find_links_to_node n,incl_discards
        n.links_to.forEach((e, i) => {
          return this.show_link(e, incl_discards);
        });
        this.update_showing_links(n);
        this.update_state(n);
        this.force.links(this.links_set);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.links(@links_set) show_links_to_node");
        }
        return this.restart();
      }

      update_state(node) {
        if (node.state === this.graphed_set && node.links_shown.length === 0) {
          this.shelved_set.acquire(node);
          this.unpin(node);
        }
        //console.debug("update_state() had to @shelved_set.acquire(#{node.name})",node)
        if (node.state !== this.graphed_set && node.links_shown.length > 0) {
          //console.debug("update_state() had to @graphed_set.acquire(#{node.name})",node)
          return this.graphed_set.acquire(node);
        }
      }

      hide_links_to_node(n) {
        n.links_to.forEach((e, i) => {
          this.remove_from(e, n.links_shown);
          this.remove_from(e, e.source.links_shown);
          e.unshow();
          this.links_set.remove(e);
          this.remove_ghosts(e);
          this.update_state(e.source);
          this.update_showing_links(e.source);
          return this.update_showing_links(e.target);
        });
        this.update_state(n);
        this.force.links(this.links_set);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.links() hide_links_to_node");
        }
        return this.restart();
      }

      show_links_from_node(n, incl_discards) {
        incl_discards = incl_discards || false;
        //if not n.links_from_found
        //  @find_links_from_node n
        n.links_from.forEach((e, i) => {
          return this.show_link(e, incl_discards);
        });
        this.update_state(n);
        this.force.links(this.links_set);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.links() show_links_from_node");
        }
        return this.restart();
      }

      hide_links_from_node(n) {
        n.links_from.forEach((e, i) => {
          this.remove_from(e, n.links_shown);
          this.remove_from(e, e.target.links_shown);
          e.unshow();
          this.links_set.remove(e);
          this.remove_ghosts(e);
          this.update_state(e.target);
          this.update_showing_links(e.source);
          return this.update_showing_links(e.target);
        });
        this.force.links(this.links_set);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.links hide_links_from_node");
        }
        return this.restart();
      }

      attach_predicate_to_its_parent(a_pred) {
        var parent_id, parent_pred;
        parent_id = this.ontology.subPropertyOf[a_pred.lid] || 'anything';
        if (parent_id != null) {
          parent_pred = this.get_or_create_predicate_by_id(parent_id);
          a_pred.register_superclass(parent_pred);
        }
      }

      get_or_create_predicate_by_id(sid) {
        var obj_id, obj_n;
        obj_id = this.make_qname(sid);
        obj_n = this.predicate_set.get_by('id', obj_id);
        if (obj_n == null) {
          obj_n = new Predicate(obj_id);
          this.predicate_set.add(obj_n);
          this.attach_predicate_to_its_parent(obj_n);
        }
        return obj_n;
      }

      clean_up_dirty_predicates() {
        var pred;
        pred = this.predicate_set.get_by('id', 'anything');
        if (pred != null) {
          return pred.clean_up_dirt();
        }
      }

      clean_up_dirty_taxons() {
        if (this.taxonomy.Thing != null) {
          return this.taxonomy.Thing.clean_up_dirt();
        }
      }

      clean_up_all_dirt_once() {
        if (this.clean_up_all_dirt_onceRunner == null) {
          this.clean_up_all_dirt_onceRunner = new OnceRunner(0, 'clean_up_all_dirt_once');
        }
        return this.clean_up_all_dirt_onceRunner.setTimeout(this.clean_up_all_dirt, 300);
      }

      clean_up_all_dirt() {
        //console.warn("clean_up_all_dirt()")
        this.clean_up_dirty_taxons();
        this.clean_up_dirty_predicates();
      }

      //@regenerate_english()
      //setTimeout(@clean_up_dirty_predictes, 500)
      //setTimeout(@clean_up_dirty_predictes, 3000)
      prove_OnceRunner(timeout) {
        var yahoo;
        if (this.prove_OnceRunner_inst == null) {
          this.prove_OnceRunner_inst = new OnceRunner(30);
        }
        yahoo = function() {
          return alert('yahoo!');
        };
        return this.prove_OnceRunner_inst.setTimeout(yahoo, timeout);
      }

      get_or_create_context_by_id(sid) {
        var obj_id, obj_n;
        obj_id = this.make_qname(sid);
        obj_n = this.context_set.get_by('id', obj_id);
        if (obj_n == null) {
          obj_n = {
            id: obj_id
          };
          this.context_set.add(obj_n);
        }
        return obj_n;
      }

      get_or_create_node_by_id(uri, name, isLiteral) {
        var node, node_id;
        // FIXME OMG must standardize on .lid as the short local id, ie internal id
        //node_id = @make_qname(uri) # REVIEW: what about uri: ":" ie the current graph
        node_id = uri;
        node = this.nodes.get_by('id', node_id);
        if (node == null) {
          node = this.embryonic_set.get_by('id', node_id);
        }
        if (node == null) {
          // at this point the node is embryonic, all we know is its uri!
          node = new Node(node_id, this.use_lid_as_node_name);
          if (isLiteral != null) {
            node.isLiteral = isLiteral;
          }
          if (node.id == null) {
            alert(`new Node('${uri}') has no id`);
          }
          //@nodes.add(node)
          this.embryonic_set.add(node);
        }
        if (node.type == null) {
          node.type = "Thing";
        }
        if (node.lid == null) {
          node.lid = uniquer(node.id);
        }
        if (node.name == null) {
          // FIXME dereferencing of @ontology.label should be by curie, not lid
          // if name is empty string, that is acceptable
          // if no name is provided, we use the label from the ontology if available
          if (name == null) {
            // Leave defaulting to the use of node.lid to @set_name() itself.
            // If we do that here then nothing is recognized as being nameless.
            name = this.ontology.label[node.lid] || null;
          }
          this.set_name(node, name);
        }
        return node;
      }

      develop(node) {
        // If the node is embryonic and is ready to hatch, then hatch it.
        // In other words if the node is now complete enough to do interesting
        // things with, then let it join the company of other complete nodes.
        if ((node.embryo != null) && this.is_ready(node)) {
          this.hatch(node);
          return true;
        }
        return false;
      }

      hatch(node) {
        var new_set, start_point;
        // Take a node from being 'embryonic' to being a fully graphable node
        //console.log node.id+" "+node.name+" is being hatched!"
        node.lid = uniquer(node.id); // FIXME ensure uniqueness
        this.embryonic_set.remove(node);
        new_set = this.get_default_set_by_type(node);
        if (new_set != null) {
          new_set.acquire(node);
        }
        this.assign_types(node, "hatch");
        start_point = [this.cx, this.cy];
        node.point(start_point);
        node.prev_point([start_point[0] * 1.01, start_point[1] * 1.01]);
        this.add_node_ghosts(node);
        this.update_showing_links(node);
        this.nodes.add(node);
        this.recolor_node(node);
        this.tick("Tick in hatch");
        this.pfm_count('hatch');
        return node;
      }

      get_or_create_transient_node(subjNode, point) {
        var isLiteral, name, nom, transient_id, transient_node;
        transient_id = '_:_transient';
        nom = "↪";
        nom = " ";
        transient_node = this.get_or_create_node_by_id(transient_id, (name = nom), (isLiteral = false));
        this.move_node_to_point(transient_node, {
          x: subjNode.x,
          y: subjNode.y
        });
        transient_node.radius = 0;
        transient_node.charge = 20;
        return transient_node;
      }

      // TODO: remove this method
      make_nodes(g, limit) {
        var count, ref, results1, subj, subj_uri, subject;
        limit = limit || 0;
        count = 0;
        ref = g.subjects;
        //my_graph.subjects
        results1 = [];
        for (subj_uri in ref) {
          subj = ref[subj_uri];
          //console.log subj, g.subjects[subj]  if @verbosity >= @DEBUG
          //console.log subj_uri
          //continue  unless subj.match(ids_to_show)
          subject = subj; //g.subjects[subj]
          this.get_or_make_node(subject, [this.width / 2, this.height / 2], false);
          count++;
          if (limit && count >= limit) {
            break;
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }

      make_links(g, limit) {
        limit = limit || 0;
        this.nodes.some((node, i) => {
          var subj;
          subj = node.s;
          this.show_links_from_node(this.nodes[i]);
          if ((limit > 0) && (this.links_set.length >= limit)) {
            return true;
          }
        });
        return this.restart();
      }

      hide_node_links(node) {
        node.links_shown.forEach((e, i) => {
          this.links_set.remove(e);
          if (e.target === node) {
            this.remove_from(e, e.source.links_shown);
            this.update_state(e.source);
            e.unshow();
            this.update_showing_links(e.source);
          } else {
            this.remove_from(e, e.target.links_shown);
            this.update_state(e.target);
            e.unshow();
            this.update_showing_links(e.target);
          }
          return this.remove_ghosts(e);
        });
        node.links_shown = [];
        this.update_state(node);
        return this.update_showing_links(node);
      }

      hide_found_links() {
        this.nodes.forEach((node, i) => {
          if (node.name.match(search_regex)) {
            return this.hide_node_links(node);
          }
        });
        return this.restart();
      }

      discard_found_nodes() {
        this.nodes.forEach((node, i) => {
          if (node.name.match(search_regex)) {
            return this.discard(node);
          }
        });
        return this.restart();
      }

      show_node_links(node) {
        this.show_links_from_node(node);
        this.show_links_to_node(node);
        return this.update_showing_links(node);
      }

      toggle_display_tech(ctrl, tech) {
        var val;
        val = void 0;
        tech = ctrl.parentNode.id;
        if (tech === "use_canvas") {
          this.use_canvas = !this.use_canvas;
          if (!this.use_canvas) {
            this.clear_canvas();
          }
          val = this.use_canvas;
        }
        if (tech === "use_svg") {
          this.use_svg = !this.use_svg;
          val = this.use_svg;
        }
        if (tech === "use_webgl") {
          this.use_webgl = !this.use_webgl;
          val = this.use_webgl;
        }
        ctrl.checked = val;
        this.tick("Tick in toggle_display_tech");
        return true;
      }

      label(branded) {
        this.labelled_set.add(branded);
      }

      unlabel(anonymized) {
        this.labelled_set.remove(anonymized);
      }

      get_point_from_polar_coords(polar) {
        var degrees, radians, range;
        ({range, degrees} = polar);
        radians = 2 * Math.PI * (degrees - 90) / 360;
        return [this.cx + range * Math.cos(radians) * this.graph_region_radius, this.cy + range * Math.sin(radians) * this.graph_region_radius];
      }

      pin(node, cmd) {
        var pin_point;
        if (node.state === this.graphed_set) {
          if ((cmd != null) && cmd.polar_coords) {
            pin_point = this.get_point_from_polar_coords(cmd.polar_coords);
            node.prev_point(pin_point);
          }
          this.pinned_set.add(node);
          return true;
        }
        return false;
      }

      unpin(node) {
        delete node.pinned_only_while_chosen; // do it here in case of direct unpinning
        if (node.fixed) {
          this.pinned_set.remove(node);
          return true;
        }
        return false;
      }

      unlink(unlinkee) {
        // FIXME discover whether unlink is still needed
        this.hide_links_from_node(unlinkee);
        this.hide_links_to_node(unlinkee);
        this.shelved_set.acquire(unlinkee);
        this.update_showing_links(unlinkee);
        return this.update_state(unlinkee);
      }

      
      //  The DISCARDED are those nodes which the user has
      //  explicitly asked to not have drawn into the graph.
      //  The user expresses this by dropping them in the
      //  discard_dropzone.

      discard(goner) {
        var shown;
        this.unpin(goner);
        this.unlink(goner);
        this.discarded_set.acquire(goner);
        shown = this.update_showing_links(goner);
        this.unselect(goner);
        //@update_state(goner)
        return goner;
      }

      undiscard(prodigal) { // TODO(smurp) rename command to 'retrieve' ????
        if (this.discarded_set.has(prodigal)) { // see test 'retrieving should only affect nodes which are discarded'
          this.shelved_set.acquire(prodigal);
          this.update_showing_links(prodigal);
          this.update_state(prodigal);
        }
        return prodigal;
      }

      
      //  The CHOSEN are those nodes which the user has
      //  explicitly asked to have the links shown for.
      //  This is different from those nodes which find themselves
      //  linked into the graph because another node has been chosen.

      shelve(goner) {
        var shownness;
        this.unpin(goner);
        this.chosen_set.remove(goner);
        this.hide_node_links(goner);
        this.shelved_set.acquire(goner);
        shownness = this.update_showing_links(goner);
        if (goner.links_shown.length > 0) {
          console.log("shelving failed for", goner);
        }
        return goner;
      }

      choose(chosen) {
        var message, msg, shownness;
        // If this chosen node is part of a SPARQL query set, then check if it is fully loaded
        // if it isn't then load and activate
        //console.log chosen
        if ((this.endpoint_loader != null) && this.endpoint_loader.value) { // This is part of a sparql set
          if (!chosen.fully_loaded) {
            //console.log "Time to make a new SPARQL query using: " + chosen.id + " - requests underway: " + @endpoint_loader.outstanding_requests
            // If there are more than certain number of requests, stop the process
            if (this.endpoint_loader.outstanding_requests < 10) {
              //@endpoint_loader.outstanding_requests = @endpoint_loader.outstanding_requests + 1
              this.endpoint_loader.outstanding_requests++;
              //console.log "Less than 6 so go ahead " + message
              //@load_new_endpoint_data_and_show(chosen.id)
              // TEST of calling Worker for Ajax
              this.add_nodes_from_SPARQL_Worker(chosen.id);
              console.log("Request counter: " + this.endpoint_loader.outstanding_requests);
            } else {
              if ($("#blurtbox").html()) {
                //console.log "Don't add error message " + message
                console.log("Request counter (over): " + this.endpoint_loader.outstanding_requests);
              } else {
                //console.log "Error message " + message
                msg = "There are more than 300 requests in the que. Restricting process. " + message;
                this.blurt(msg, 'alert');
                message = true;
                console.log("Request counter: " + this.endpoint_loader.outstanding_requests);
              }
            }
          }
        }
        // There is a flag .chosen in addition to the state 'linked'
        // because linked means it is in the graph
        this.chosen_set.add(chosen); // adding the flag .chosen does not affect the .state
        this.nowChosen_set.add(chosen); // adding the flag .nowChosen does not affect the .state
        // do it early so add_link shows them otherwise choosing from discards just puts them on the shelf
        this.graphed_set.acquire(chosen); // .acquire means DO change the .state to graphed vs shelved etc
        this.show_links_from_node(chosen);
        this.show_links_to_node(chosen);
        this.update_state(chosen);
        shownness = this.update_showing_links(chosen);
        return chosen;
      }

      unchoose(unchosen) {
        var j, link, ref;
        // To unchoose a node is to remove the chosen flag and unshow the edges
        // to any nodes which are not themselves chosen.  If that means that
        // this 'unchosen' node is now no longer graphed, so be it.

        //   remove the node from the chosen set
        //     loop thru all links_shown
        //       if neither end of the link is chosen then
        //         unshow the link
        // @unpin unchosen # TODO figure out why this does not cleanse pin
        this.chosen_set.remove(unchosen);
        ref = unchosen.links_shown;
        for (j = ref.length - 1; j >= 0; j += -1) {
          link = ref[j];
          if (link != null) {
            if (!((link.target.chosen != null) || (link.source.chosen != null))) {
              this.unshow_link(link);
            }
          } else {
            console.log("there is a null in the .links_shown of", unchosen);
          }
        }
        return this.update_state(unchosen);
      }

      wander__atFirst() {
        var j, len1, node, ref, results1;
        // Purpose:
        //   At first, before the verb Wander is executed on any node, we must
        // build a SortedSet of the nodes which were wasChosen to compare
        // with the SortedSet of nodes which are intendedToBeGraphed as a
        // result of the Wander command which is being executed.
        if (!this.wasChosen_set.clear()) {
          throw new Error("expecting wasChosen to be empty");
        }
        ref = this.chosen_set;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          node = ref[j];
          results1.push(this.wasChosen_set.add(node));
        }
        return results1;
      }

      wander__atLast() {
        var j, len1, node, nowRollCall, removed, wasRollCall;
        // Purpose:
        //   At last, after all appropriate nodes have been pulled into the graph
        // by the Wander verb, it is time to remove wasChosen nodes which
        // are not nowChosen.  In other words, ungraph those nodes which
        // are no longer held in the graph by any recently wandered-to nodes.
        wasRollCall = this.wasChosen_set.roll_call();
        nowRollCall = this.nowChosen_set.roll_call();
        removed = this.wasChosen_set.filter((node) => {
          return !this.nowChosen_set.includes(node);
        });
        for (j = 0, len1 = removed.length; j < len1; j++) {
          node = removed[j];
          this.unchoose(node);
          this.wasChosen_set.remove(node);
        }
        if (!this.nowChosen_set.clear()) {
          throw new Error("the nowChosen_set should be empty after clear()");
        }
      }

      wander(chosen) {
        // Wander is just the same as Choose (AKA Activate) except afterward it deactivates the
        // nodes which were in the chosen_set before but are not in the set being wandered.
        // This is accomplished by wander__build_callback()
        return this.choose(chosen);
      }

      unwalk(node) {
        this.walked_set.remove(node);
        delete node.walkedIdx0;
      }

      walkBackTo(existingStep) {
        var j, pathNode, ref, removed;
        // note that if existingStep is null (ie a non-node) we will walk back all
        removed = [];
        ref = this.walked_set;
        for (j = ref.length - 1; j >= 0; j += -1) {
          pathNode = ref[j];
          if (pathNode === existingStep) {
            break;
          }
          // remove these intervening nodes
          this.unchoose(pathNode);
          this.shave(pathNode);
          this.unwalk(pathNode);
          removed.push(pathNode);
        }
        return removed;
      }

      walkBackAll() {
        return this.walkBackTo(null);
      }

      walk(nextStep) {
        var lastWalked, tooHairy;
        tooHairy = null;
        if (nextStep.walked) {
          // 1) if this node already in @walked_set then remove inwtervening nodes
          // ie it is already in the path so walk back to it
          this.walkBackTo(nextStep); // stop displaying those old links
          this.choose(nextStep);
          return;
        }
        if (this.walked_set.length) { // is there already a walk path in progress?
          lastWalked = this.walked_set.slice(-1)[0];
          if (this.nodesAreAdjacent(nextStep, lastWalked)) { // is nextStep linked to lastWalked?
            // 2) handle the case of this being the next in a long chain of adjacent nodes
            tooHairy = lastWalked; // Shave this guy later. If we do it now, nextStep gets ungraphed!
          } else {
            // 3) start a new path because nextStep is not connected with the @walked_set
            this.walkBackAll(); // clean up the old path completely
          }
        }
        
        // this should happen to every node added to @walked_set
        nextStep.walkedIdx0 = this.walked_set.length; // tell it what position it will have in the path
        if (!nextStep.walked) { // It might already be in the path, if not...
          this.walked_set.add(nextStep); // add it
        }
        this.choose(nextStep); // finally, choose nextStep to make it hairy
        if (tooHairy) { // as promised we now deal with the last node
          this.shave(tooHairy); // ungraph the non-path nodes which were held in the graph by tooHairy
      // so the javascript is not cluttered with confusing nonsense
        }
      }

      nodesAreAdjacent(n1, n2) {
        var busyNode, j, len1, len2, link, lonelyNode, o, ref, ref1;
        // figure out which node is least connected so we do the least work checking links
        if ((n1.links_from.length + n1.links_to.length) > (n2.links_from.length + n2.links_to.length)) {
          [lonelyNode, busyNode] = [n2, n1];
        } else {
          [lonelyNode, busyNode] = [n1, n2];
        }
        ref = lonelyNode.links_from;
        // iterate through the outgoing links of the lonlier node, breaking on adjacency
        for (j = 0, len1 = ref.length; j < len1; j++) {
          link = ref[j];
          if (link.target === busyNode) {
            return true;
          }
        }
        ref1 = lonelyNode.links_to;
        // iterate through the incoming links of the lonlier node, breaking on adjacency
        for (o = 0, len2 = ref1.length; o < len2; o++) {
          link = ref1[o];
          if (link.source === busyNode) {
            return true;
          }
        }
        return false;
      }

      shave(tooHairy) {
        var j, link, ref;
        ref = tooHairy.links_shown;
        for (j = ref.length - 1; j >= 0; j += -1) {
          link = ref[j];
          if (link != null) {
            if ((link.target.walked == null) || (link.source.walked == null)) {
              this.unshow_link(link);
            }
            if (!this.edgeIsOnWalkedPath(link)) {
              this.unshow_link(link);
            }
          } else {
            console.log("there is a null in the .links_shown of", unchosen);
          }
        }
        return this.update_state(tooHairy); // update the pickers concerning these changes REVIEW needed?
      }

      edgeIsOnWalkedPath(edge) {
        return this.nodesAreAdjacentOnWalkedPath(edge.target, edge.source);
      }

      nodesAreAdjacentOnWalkedPath(n1, n2) {
        var larger, n1idx0, n2idx0, smaller;
        n1idx0 = n1.walkedIdx0;
        n2idx0 = n2.walkedIdx0;
        if ((n1idx0 != null) && (n2idx0 != null)) {
          larger = Math.max(n1idx0, n2idx0);
          smaller = Math.min(n1idx0, n2idx0);
          if (larger - smaller === 1) {
            return true;
          }
        }
        return false;
      }

      hide(goner) {
        var shownness;
        this.unpin(goner);
        this.chosen_set.remove(goner);
        this.hidden_set.acquire(goner);
        this.selected_set.remove(goner);
        goner.unselect();
        this.hide_node_links(goner);
        this.update_state(goner);
        return shownness = this.update_showing_links(goner);
      }

      // The verbs SELECT and UNSELECT perhaps don't need to be exposed on the UI
      // but they perform the function of manipulating the @selected_set
      select(node) {
        var msg;
        if (node.selected == null) {
          this.selected_set.add(node);
          if (node.select != null) {
            node.select();
            return this.recolor_node(node);
          } else {
            msg = `${node.__proto__.constructor.name} ${node.id} lacks .select()`;
            throw msg;
            return console.error(msg, node);
          }
        }
      }

      unselect(node) {
        if (node.selected != null) {
          this.selected_set.remove(node);
          node.unselect();
          this.recolor_node(node);
        }
      }

      // These are the EDITING VERBS: connect, spawn, specialize and annotate
      connect(node) {
        if (node !== this.focused_node) {
          console.info(`connect('${node.lid}') SKIPPING because it is not the focused node`);
          return;
        }
        this.editui.set_state('seeking_object');
        this.editui.set_subject_node(node);
        this.transient_node = this.get_or_create_transient_node(node);
        this.editui.set_object_node(this.transient_node);
        this.dragging = this.transient_node;
        return console.log(this.transient_node.state.id);
      }

      //alert("connect('#{node.lid}')")
      set_unique_color(uniqcolor, set, node) {
        var old_node;
        if (set.uniqcolor == null) {
          set.uniqcolor = {};
        }
        old_node = set.uniqcolor[uniqcolor];
        if (old_node) {
          old_node.color = old_node.uniqucolor_orig;
          delete old_node.uniqcolor_orig;
        }
        set.uniqcolor[uniqcolor] = node;
        node.uniqcolor_orig = node.color;
        node.color = uniqcolor;
      }

      animate_hunt(array, sought_node, mid_node, prior_node, pos) {
        var cmd, cmdArgs, edge, pred_uri, trail_pred;
        //sought_node.color = 'red'
        pred_uri = 'hunt:trail';
        if (mid_node) {
          mid_node.color = 'black';
          mid_node.radius = 100;
          this.label(mid_node);
        }
        if (prior_node) {
          this.ensure_predicate_lineage(pred_uri);
          trail_pred = this.get_or_create_predicate_by_id(pred_uri);
          edge = this.get_or_create_Edge(mid_node, prior_node, trail_pred, 'http://universal.org');
          edge.label = JSON.stringify(pos);
          this.infer_edge_end_types(edge);
          edge.color = this.gclui.predicate_picker.get_color_forId_byName(trail_pred.lid, 'showing');
          this.add_edge(edge);
        }
        //@show_link(edge)
        if (pos.done) {
          cmdArgs = {
            verbs: ['show'],
            regarding: [pred_uri],
            sets: [this.shelved_set.id]
          };
          cmd = new gcl.GraphCommand(this, cmdArgs);
          this.run_command(cmd);
          return this.clean_up_all_dirt_once();
        }
      }

      hunt(node) {
        // Hunt is just a test verb to animate SortedSet.binary_search() for debugging
        this.animate_hunt(this.shelved_set, node, null, null, {});
        return this.shelved_set.binary_search(node, false, this.animate_hunt);
      }

      recolor_node(n, default_color) {
        var color, j, len1, ref, results1, taxon_id;
        if (default_color == null) {
          default_color = 'black';
        }
        if (n._types == null) {
          n._types = [];
        }
        if (this.color_nodes_as_pies && n._types.length > 1) {
          n._colors = [];
          ref = n._types;
          results1 = [];
          for (j = 0, len1 = ref.length; j < len1; j++) {
            taxon_id = ref[j];
            if (typeof taxon_id === 'string') {
              color = this.get_color_for_node_type(n, taxon_id) || default_color;
              results1.push(n._colors.push(color));
            } else {
              results1.push(void 0);
            }
          }
          return results1;
        } else {
          //n._colors = ['red','orange','yellow','green','blue','purple']
          return n.color = this.get_color_for_node_type(n, n.type);
        }
      }

      get_color_for_node_type(node, type) {
        var state;
        state = (node.selected != null) && "emphasizing" || "showing";
        return this.gclui.taxon_picker.get_color_forId_byName(type, state);
      }

      recolor_nodes() {
        var j, len1, node, ref, results1;
        // The nodes needing recoloring are all but the embryonic.
        if (this.nodes) {
          ref = this.nodes;
          results1 = [];
          for (j = 0, len1 = ref.length; j < len1; j++) {
            node = ref[j];
            results1.push(this.recolor_node(node));
          }
          return results1;
        }
      }

      toggle_selected(node) {
        if (node.selected != null) {
          this.unselect(node);
        } else {
          this.select(node);
        }
        this.update_all_counts();
        this.regenerate_english();
        return this.tick("Tick in toggle_selected");
      }

      // ========================================== SNIPPET (INFO BOX) UI =============================================================================
      get_snippet_url(snippet_id) {
        if (snippet_id.match(/http\:/)) {
          return snippet_id;
        } else {
          return `${window.location.origin}${this.get_snippetServer_path(snippet_id)}`;
        }
      }

      get_snippetServer_path(snippet_id) {
        var ref, which;
        // this relates to index.coffee and the urls for the
        if ((ref = this.data_uri) != null ? ref.match('poetesses') : void 0) {
          console.info(this.data_uri, this.data_uri.match('poetesses'));
          which = "poetesses";
        } else {
          which = "orlando";
        }
        return `/snippet/${which}/${snippet_id}/`;
      }

      get_snippet_js_key(snippet_id) {
        // This is in case snippet_ids can not be trusted as javascript
        // property ids because they might have leading '-' or something.
        return "K_" + snippet_id;
      }

      get_snippet(snippet_id, callback) {
        var snippet_js_key, snippet_text, url;
        snippet_js_key = this.get_snippet_js_key(snippet_id);
        snippet_text = this.snippet_db[snippet_js_key];
        url = this.get_snippet_url(snippet_id);
        if (snippet_text) {
          callback(null, {
            response: snippet_text,
            already_has_snippet_id: true
          });
        } else {
          //url = "http://localhost:9999/snippet/poetesses/b--balfcl--0--P--3/"
          //console.warn(url)
          d3.xhr(url, callback);
        }
        return "got it";
      }

      clear_snippets(evt) {
        if ((evt != null) && (evt.target != null) && !$(evt.target).hasClass('close_all_snippets_button')) {
          return false;
        }
        this.currently_printed_snippets = {};
        this.snippet_positions_filled = {};
        $('.snippet_dialog_box').remove();
      }

      init_snippet_box() {
        if (d3.select('#snippet_box')[0].length > 0) {
          this.snippet_box = d3.select('#snippet_box');
          return console.log("init_snippet_box");
        }
      }

      remove_snippet(snippet_id) {
        var key, slctr;
        key = this.get_snippet_js_key(snippet_id);
        delete this.currently_printed_snippets[key];
        if (this.snippet_box) {
          slctr = '#' + id_escape(snippet_id);
          console.log(slctr);
          return this.snippet_box.select(slctr).remove();
        }
      }

      push_snippet(obj, msg) {
        var bomb_parent, close_all_button, dialog_args, dlg, elem, my_position, snip_div;
        console.log("push_snippet");
        if (this.snippet_box) {
          snip_div = this.snippet_box.append('div').attr('class', 'snippet');
          snip_div.html(msg);
          $(snip_div[0][0]).addClass("snippet_dialog_box");
          my_position = this.get_next_snippet_position();
          dialog_args = {
            //maxHeight: @snippet_size
            minWidth: 400,
            title: obj.dialog_title,
            position: {
              my: my_position,
              at: "left top",
              of: window
            },
            close: (event, ui) => {
              event.stopPropagation();
              delete this.snippet_positions_filled[my_position];
              delete this.currently_printed_snippets[event.target.id];
            }
          };
          dlg = $(snip_div).dialog(dialog_args);
          elem = dlg[0][0];
          elem.setAttribute("id", obj.snippet_js_key);
          bomb_parent = $(elem).parent().select(".ui-dialog-titlebar").children().first();
          close_all_button = bomb_parent.append('<button type="button" class="ui-button ui-corner-all ui-widget close-all" role="button" title="Close All""><img class="close_all_snippets_button" src="close_all.png" title="Close All"></button>');
          //append('<span class="close_all_snippets_button" title="Close All"></span>')
          //append('<img class="close_all_snippets_button" src="close_all.png" title="Close All">')
          close_all_button.on('click', this.clear_snippets);
        }
      }

      get_next_snippet_position() {
        var height, hinc, hoff, left_full, retval, top_full, vinc, voff, width;
        // Fill the left edge, then the top edge, then diagonally from top-left
        height = this.height;
        width = this.width;
        left_full = false;
        top_full = false;
        hinc = 0;
        vinc = this.snippet_size;
        hoff = 0;
        voff = 0;
        retval = `left+${hoff} top+${voff}`;
        while (this.snippet_positions_filled[retval] != null) {
          hoff = hinc + hoff;
          voff = vinc + voff;
          retval = `left+${hoff} top+${voff}`;
          if (!left_full && voff + vinc + vinc > height) {
            left_full = true;
            hinc = this.snippet_size;
            hoff = 0;
            voff = 0;
            vinc = 0;
          }
          if (!top_full && hoff + hinc + hinc + hinc > width) {
            top_full = true;
            hinc = 30;
            vinc = 30;
            hoff = 0;
            voff = 0;
          }
        }
        this.snippet_positions_filled[retval] = true;
        return retval;
      }

      // =============================================================================================================================
      remove_tags(xml) {
        return xml.replace(XML_TAG_REGEX, " ").replace(MANY_SPACES_REGEX, " ");
      }

      // peek selects a node so that subsequent mouse motions select not nodes but edges of this node
      peek(node) {
        var was_already_peeking;
        was_already_peeking = false;
        if (this.peeking_node != null) {
          if (this.peeking_node === node) {
            was_already_peeking = true;
          }
          this.recolor_node(this.peeking_node);
          this.unflag_all_edges(this.peeking_node);
        }
        if (!was_already_peeking) {
          this.peeking_node = node;
          return this.peeking_node.color = PEEKING_COLOR;
        }
      }

      unflag_all_edges(node) {
        var edge, j, len1, ref, results1;
        ref = node.links_shown;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          edge = ref[j];
          results1.push(edge.focused = false);
        }
        return results1;
      }

      print_edge(edge) {
        var context, context_no, j, len1, make_callback, me, ref, results1, snippet_js_key;
        // @clear_snippets()
        context_no = 0;
        ref = edge.contexts;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          context = ref[j];
          snippet_js_key = this.get_snippet_js_key(context.id);
          context_no++;
          if (this.currently_printed_snippets[snippet_js_key] != null) {
            // FIXME add the Subj--Pred--Obj line to the snippet for this edge
            //   also bring such snippets to the top
            console.log("  skipping because", this.currently_printed_snippets[snippet_js_key]);
            continue;
          }
          me = this;
          make_callback = (context_no, edge, context) => {
            return (err, data) => {
              var quad, snippet_id, snippet_text;
              data = data || {
                response: ""
              };
              snippet_text = data.response;
              if (!data.already_has_snippet_id) {
                snippet_text = me.remove_tags(snippet_text);
                snippet_text += '<br><code class="snippet_id">' + context.id + "</code>";
              }
              snippet_id = context.id;
              snippet_js_key = me.get_snippet_js_key(snippet_id);
              if (me.currently_printed_snippets[snippet_js_key] == null) {
                me.currently_printed_snippets[snippet_js_key] = [];
              }
              me.currently_printed_snippets[snippet_js_key].push(edge);
              me.snippet_db[snippet_js_key] = snippet_text;
              me.printed_edge = edge;
              quad = {
                subj_uri: edge.source.id,
                pred_uri: edge.predicate.id,
                graph_uri: this.data_uri
              };
              if (edge.target.isLiteral) {
                quad.obj_val = edge.target.name.toString();
              } else {
                quad.obj_uri = edge.target.id;
              }
              return me.push_snippet({
                edge: edge,
                pred_id: edge.predicate.lid,
                pred_name: edge.predicate.name,
                context_id: context.id,
                quad: quad,
                dialog_title: edge.source.name,
                snippet_text: snippet_text,
                no: context_no,
                snippet_js_key: snippet_js_key
              });
            };
          };
          results1.push(this.get_snippet(context.id, make_callback(context_no, edge, context)));
        }
        return results1;
      }

      // The Verbs PRINT and REDACT show and hide snippets respectively
      print(node) {
        var edge, j, len1, ref;
        this.clear_snippets();
        ref = node.links_shown;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          edge = ref[j];
          this.print_edge(edge);
        }
      }

      redact(node) {
        return node.links_shown.forEach((edge, i) => {
          return this.remove_snippet(edge.id);
        });
      }

      draw_edge_regarding(node, predicate_lid) {
        var dirty, doit;
        dirty = false;
        doit = (edge, i, frOrTo) => {
          if (edge.predicate.lid === predicate_lid) {
            if (edge.shown == null) {
              this.show_link(edge);
              return dirty = true;
            }
          }
        };
        node.links_from.forEach((edge, i) => {
          return doit(edge, i, 'from');
        });
        node.links_to.forEach((edge, i) => {
          return doit(edge, i, 'to');
        });
        if (dirty) {
          this.update_state(node);
          this.update_showing_links(node);
          this.force.alpha(0.1);
          if (!this.args.skip_log_tick) {
            console.log("Tick in @force.alpha draw_edge_regarding");
          }
        }
      }

      undraw_edge_regarding(node, predicate_lid) {
        var dirty, doit;
        dirty = false;
        doit = (edge, i, frOrTo) => {
          if (edge.predicate.lid === predicate_lid) {
            dirty = true;
            return this.unshow_link(edge);
          }
        };
        node.links_from.forEach((edge, i) => {
          return doit(edge, i, 'from');
        });
        node.links_to.forEach((edge, i) => {
          return doit(edge, i, 'to');
        });
        // FIXME(shawn) Looping through links_shown should suffice, try it again
        //node.links_shown.forEach (edge,i) =>
        //  doit(edge,'shown')
        if (dirty) {
          this.update_state(node);
          this.update_showing_links(node);
          this.force.alpha(0.1);
        }
      }

      update_history() {
        var n_chosen, the_state, the_title, the_url;
        if (window.history.pushState) {
          the_state = {};
          hash = "";
          if (chosen_set.length) {
            the_state.chosen_node_ids = [];
            hash += "#";
            hash += "chosen=";
            n_chosen = chosen_set.length;
            this.chosen_set.forEach((chosen, i) => {
              hash += chosen.id;
              the_state.chosen_node_ids.push(chosen.id);
              if (n_chosen > i + 1) {
                return hash += ",";
              }
            });
          }
          the_url = location.href.replace(location.hash, "") + hash;
          the_title = document.title;
          return window.history.pushState(the_state, the_title, the_state);
        }
      }

      // TODO: remove this method
      restore_graph_state(state) {
        //console.log('state:',state);
        if (!state) {
          return;
        }
        if (state.chosen_node_ids) {
          this.reset_graph();
          return state.chosen_node_ids.forEach((chosen_id) => {
            var chosen;
            chosen = get_or_make_node(chosen_id);
            if (chosen) {
              return this.choose(chosen);
            }
          });
        }
      }

      fire_showgraph_event() {
        return window.dispatchEvent(new CustomEvent('showgraph', {
          detail: {
            message: "graph shown",
            time: new Date()
          },
          bubbles: true,
          cancelable: true
        }));
      }

      showGraph(g) {
        alert("showGraph called");
        this.make_nodes(g);
        if (window.CustomEvent != null) {
          this.fire_showgraph_event();
        }
        return this.restart();
      }

      show_the_edges() {}

      //edge_controller.show_tree_in.call(arguments)
      register_gclc_prefixes() {
        var abbr, prefix, ref, results1;
        this.gclc.prefixes = {};
        ref = this.G.prefixes;
        results1 = [];
        for (abbr in ref) {
          prefix = ref[abbr];
          results1.push(this.gclc.prefixes[abbr] = prefix);
        }
        return results1;
      }

      // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
      init_datasetDB() {
        var indexedDB, request;
        indexedDB = window.indexedDB; // || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null
        if (!indexedDB) {
          console.log("indexedDB not available");
        }
        if (!this.datasetDB && indexedDB) {
          this.dbName = 'datasetDB';
          this.dbVersion = 2;
          request = indexedDB.open(this.dbName, this.dbVersion);
          request.onsuccess = (evt) => {
            this.datasetDB = request.result;
            this.datasetDB.onerror = (err) => {
              return alert(`Database error: ${e.target.errorCode}`);
            };
            //alert "onsuccess"
            return this.populate_menus_from_IndexedDB('onsuccess');
          };
          request.onerror = (err) => {
            return alert(`unable to init ${this.dbName}`);
          };
          return request.onupgradeneeded = (event) => {
            var db, objectStore;
            db = event.target.result;
            objectStore = db.createObjectStore("datasets", {
              keyPath: 'uri'
            });
            return objectStore.transaction.oncomplete = (evt) => {
              this.datasetDB = db;
              // alert "onupgradeneeded"
              return this.populate_menus_from_IndexedDB('onupgradeneeded');
            };
          };
        }
      }

      ensure_datasets(preload_group, store_in_db) {
        var defaults, ds_rec, j, k, len1, ref, results1;
        // note "fat arrow" so this can be an AJAX callback (see preload_datasets)
        defaults = preload_group.defaults || {};
        ref = preload_group.datasets;
        //console.log preload_group # THIS IS THE ITEMS IN A FILE (i.e. cwrc.json, generes.json)
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          ds_rec = ref[j];
// If this preload_group has defaults apply them to the ds_rec if it is missing that value.
// We do not want to do ds_rec.__proto__ = defaults because then defaults are not ownProperty
          for (k in defaults) {
            if (ds_rec[k] == null) {
              ds_rec[k] = defaults[k];
            }
          }
          results1.push(this.ensure_dataset(ds_rec, store_in_db));
        }
        return results1;
      }

      ensure_dataset(rsrcRec, store_in_db) {
        var uri;
        // ensure the dataset is in the database and the correct
        uri = rsrcRec.uri;
        if (rsrcRec.time == null) {
          rsrcRec.time = new Date().toString();
        }
        if (rsrcRec.title == null) {
          rsrcRec.title = uri;
        }
        if (rsrcRec.isUri == null) {
          rsrcRec.isUri = !!uri.match(/^(http|ftp)/);
        }
        // if it has a time then a user added it therefore canDelete
        if (rsrcRec.canDelete == null) {
          rsrcRec.canDelete = !(rsrcRec.time == null);
        }
        if (rsrcRec.label == null) {
          rsrcRec.label = uri.split('/').reverse()[0];
        }
        if (rsrcRec.isOntology) {
          if (this.ontology_loader) {
            this.ontology_loader.add_resource(rsrcRec, store_in_db);
          }
        }
        if (this.dataset_loader && !rsrcRec.isEndpoint) {
          this.dataset_loader.add_resource(rsrcRec, store_in_db);
        }
        if (rsrcRec.isEndpoint && this.endpoint_loader) {
          return this.endpoint_loader.add_resource(rsrcRec, store_in_db);
        }
      }

      add_resource_to_db(rsrcRec, callback) {
        var req, store, trx;
        trx = this.datasetDB.transaction('datasets', "readwrite");
        trx.oncomplete = (e) => {
          return console.log(`${rsrcRec.uri} added!`);
        };
        trx.onerror = (e) => {
          console.log(e);
          return alert(`add_resource(${rsrcRec.uri}) error!!!`);
        };
        store = trx.objectStore('datasets');
        req = store.put(rsrcRec);
        return req.onsuccess = (e) => {
          if (rsrcRec.isEndpoint) {
            this.sparql_graph_query_and_show(e.srcElement.result, this.endpoint_loader.select_id);
            //console.log @dataset_loader
            $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
            $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
            $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
          }
          if (rsrcRec.uri !== e.target.result) {
            console.debug(`rsrcRec.uri (${rsrcRec.uri}) is expected to equal`, e.target.result);
          }
          return callback(rsrcRec);
        };
      }

      remove_dataset_from_db(dataset_uri, callback) {
        var req, store, trx;
        trx = this.datasetDB.transaction('datasets', "readwrite");
        trx.oncomplete = (e) => {
          return console.log(`${dataset_uri} deleted`);
        };
        trx.onerror = (e) => {
          console.log(e);
          return alert(`remove_dataset_from_db(${dataset_uri}) error!!!`);
        };
        store = trx.objectStore('datasets');
        req = store.delete(dataset_uri);
        req.onsuccess = (e) => {
          if (callback != null) {
            return callback(dataset_uri);
          }
        };
        return req.onerror = (e) => {
          return console.debug(e);
        };
      }

      get_resource_from_db(rsrcUri, callback) {
        var req, store, trx;
        trx = this.datasetDB.transaction('datasets', "readwrite");
        trx.oncomplete = (evt) => {
          return console.log(`get_resource_from_db('${rsrcUri}') complete, either by success or error`);
        };
        trx.onerror = (err) => {
          console.log(err);
          if (callback != null) {
            return callback(err, null);
          } else {
            alert(`get_resource_from_db(${rsrcUri}) error!!!`);
            throw err;
          }
        };
        store = trx.objectStore('datasets');
        req = store.get(rsrcUri);
        req.onsuccess = (event) => {
          if (callback != null) {
            return callback(null, event.target.result);
          }
        };
        req.onerror = (err) => {
          console.debug(`get_resource_from_db('${rsrcUri}') onerror ==>`, err);
          if (callback) {
            return callback(err, null);
          } else {
            throw err;
          }
        };
      }

      populate_menus_from_IndexedDB(why) {
        var count, datasetDB_objectStore, make_onsuccess_handler;
        // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#Using_a_cursor
        console.log(`populate_menus_from_IndexedDB(${why})`);
        datasetDB_objectStore = this.datasetDB.transaction('datasets').objectStore('datasets');
        count = 0;
        make_onsuccess_handler = (why) => {
          var recs;
          recs = [];
          return (event) => {
            var cursor, legacyDataset, legacyOntology, rec, ref;
            cursor = event.target.result;
            if (cursor) {
              count++;
              rec = cursor.value;
              recs.push(rec);
              legacyDataset = !rec.isOntology && !rec.rsrcType;
              legacyOntology = !!rec.isOntology;
              if (((ref = rec.rsrcType) === 'dataset' || ref === 'ontology') || legacyDataset || legacyOntology) {
                // both datasets and ontologies appear in the dataset menu, for visualization
                this.dataset_loader.add_resource_option(rec);
              }
              if (rec.rsrcType === 'ontology' || legacyOntology) {
                // only datasets are added to the dataset menu
                this.ontology_loader.add_resource_option(rec);
              }
              if (rec.rsrcType === 'script') {
                this.script_loader.add_resource_option(rec);
              }
              if (rec.rsrcType === 'endpoint') {
                this.endpoint_loader.add_resource_option(rec);
              }
              return cursor.continue(); // when there are no (or NO MORE) entries, ie FINALLY
            } else {
              //console.table(recs)
              // Reset the value of each loader to blank so
              // they show 'Pick or Provide...' not the last added entry.
              this.dataset_loader.val('');
              this.ontology_loader.val('');
              this.endpoint_loader.val('');
              this.script_loader.val('');
              this.update_dataset_ontology_loader();
              console.groupEnd(); // closing group called "populate_menus_from_IndexedDB(why)"
              return document.dispatchEvent(new Event('dataset_ontology_loader_ready')); // TODO use 'huvis_controls' rather than document
            }
          };
        };
        if (this.dataset_loader != null) {
          return datasetDB_objectStore.openCursor().onsuccess = make_onsuccess_handler(why);
        }
      }

      preload_datasets() {
        var j, len1, preload_group_or_uri, ref;
        // If present args.preload is expected to be a list or urls or objects.
        // Whether literal object or JSON urls the object structure is expected to be:
        //   { 'datasets': [
        //        {
        //         'uri': "/data/byroau.nq",     // url of dataset .ttl or .nq
        //         'label': "Augusta Ada Brown", // label of OPTION in SELECT
        //         'isOntology': false,          // optional, if true it goes in Onto menu
        //         'opt_group': "Individuals",   // user-defined label for menu subsection
        //         'canDelete':   false,         // meaningful only for recs in datasetsDB
        //         'ontologyUri': '/data/orlando.ttl' // url of ontology
        //         }
        //                  ],
        //     'defaults': {}  # optional, may contain default values for the keys above
        //    }
        console.groupCollapsed("preload_datasets");
        // Adds preload options to datasetDB table
        console.log(this.args.preload);
        if (this.args.preload) {
          ref = this.args.preload;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            preload_group_or_uri = ref[j];
            if (typeof preload_group_or_uri === 'string') { // the URL of a preload_group JSON
              //$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
              $.ajax({
                async: false,
                url: preload_group_or_uri,
                success: (data, textStatus) => {
                  return this.ensure_datasets_from_XHR(data);
                },
                error: function(jqxhr, textStatus, errorThrown) {
                  return console.error(preload_group_or_uri + " " + textStatus + " " + errorThrown.toString());
                }
              });
            } else if (typeof preload_group_or_uri === 'object') { // a preload_group object
              this.ensure_datasets(preload_group_or_uri);
            } else {
              console.error("bad member of @args.preload:", preload_group_or_uri);
            }
          }
        }
        return console.groupEnd(); // closing group called "preload_datasets"
      }

      preload_endpoints() {
        var j, len1, preload_group_or_uri, ref;
        console.log(this.args.preload_endpoints);
        console.groupCollapsed("preload_endpoints");
        //###
        if (this.args.preload_endpoints) {
          ref = this.args.preload_endpoints;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            preload_group_or_uri = ref[j];
            console.log(preload_group_or_uri);
            if (typeof preload_group_or_uri === 'string') { // the URL of a preload_group JSON
              //$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
              $.ajax({
                async: false,
                url: preload_group_or_uri,
                success: (data, textStatus) => {
                  return this.ensure_datasets_from_XHR(data);
                },
                error: function(jqxhr, textStatus, errorThrown) {
                  return console.error(preload_group_or_uri + " " + textStatus + " " + errorThrown.toString());
                }
              });
            } else if (typeof preload_group_or_uri === 'object') { // a preload_group object
              this.ensure_datasets(preload_group_or_uri);
            } else {
              console.error("bad member of @args.preload:", preload_group_or_uri);
            }
          }
        }
        return console.groupEnd();
      }

      //###
      ensure_datasets_from_XHR(preload_group) {
        this.ensure_datasets(preload_group, false); // false means DO NOT store_in_db
      }

      get_menu_by_rsrcType(rsrcType) {
        return this[rsrcType + '_loader'];
      }

      get_or_create_sel_for_picker(specificSel) {
        var huvis_controls_sel, pickersId, sel;
        // if specificSel is defined, return it, otherwise return the selector of a thin
        sel = specificSel;
        if (sel == null) {
          if (this.pickersSel == null) {
            pickersId = this.unique_id('pickers_');
            this.pickersSel = '#' + pickersId;
            if ((huvis_controls_sel = this.oldToUniqueTabSel['huvis_controls'])) {
              if (this.huvis_controls_elem == null) {
                this.huvis_controls_elem = document.querySelector(huvis_controls_sel);
              }
              if (this.huvis_controls_elem) {
                this.huvis_controls_elem.insertAdjacentHTML('beforeend', `<div id="${pickersId}"></div>`);
              }
            }
          }
          sel = this.pickersSel;
        }
        return sel;
      }

      init_resource_menus() {
        var endpoint_selector, last_val, sel;
        // REVIEW See views/huviz.html.eco to set dataset_loader__append_to_sel and similar
        if (!this.dataset_loader && this.args.make_pickers) {
          sel = this.get_or_create_sel_for_picker(this.args.dataset_loader__append_to_sel);
          this.dataset_loader = new PickOrProvide(this, sel, 'Dataset', 'DataPP', false, false, {
            rsrcType: 'dataset'
          });
        }
        if (!this.ontology_loader && this.args.make_pickers) {
          sel = this.get_or_create_sel_for_picker(this.args.ontology_loader__append_to_sel);
          this.ontology_loader = new PickOrProvide(this, sel, 'Ontology', 'OntoPP', true, false, {
            rsrcType: 'ontology'
          });
        }
        if (!this.script_loader && this.args.make_pickers) {
          sel = this.get_or_create_sel_for_picker(this.args.script_loader__append_to_sel);
          this.script_loader = new PickOrProvideScript(this, sel, 'Script', 'ScriptPP', false, false, {
            dndLoaderClass: DragAndDropLoaderOfScripts,
            rsrcType: 'script'
          });
        }
        if (!this.endpoint_loader && this.args.make_pickers) {
          sel = this.get_or_create_sel_for_picker(this.args.endpoint_loader__append_to_sel);
          this.endpoint_loader = new PickOrProvide(this, sel, 'Sparql', 'EndpointPP', false, true, {
            rsrcType: 'endpoint'
          });
        }
        //@endpoint_loader.outstanding_requests = 0
        if (this.endpoint_loader && !this.big_go_button) {
          this.build_sparql_form();
          endpoint_selector = `#${this.endpoint_loader.select_id}`;
          $(endpoint_selector).change(this.update_endpoint_form);
        }
        if (this.ontology_loader && !this.big_go_button) {
          this.big_go_button_id = this.unique_id('goButton_');
          this.big_go_button = $('<button class="big_go_button">LOAD</button>');
          this.big_go_button.attr('id', this.big_go_button_id);
          $(this.get_or_create_sel_for_picker()).append(this.big_go_button);
          this.big_go_button.click(this.visualize_dataset_using_ontology);
          this.big_go_button.prop('disabled', true);
        }
        this.init_datasetDB();
        this.preload_datasets();
        return typeof this.ontology_loader === "function" ? this.ontology_loader(last_val = null) : void 0; // clear the last_val so select_option works the first time
      }

      update_graph_form(e) {
        //console.log e.currentTarget.value
        return this.endpoint_loader.endpoint_graph = e.currentTarget.value;
      }

      visualize_dataset_using_ontology(ignoreEvent, dataset, ontologies) {
        var alreadyCommands, data, endpoint_label_uri, onto, scriptUri;
        colorlog('visualize_dataset_using_ontology()', dataset, ontologies);
        this.close_blurt_box();
        endpoint_label_uri = this.endpoint_labels_JQElem.val();
        if (endpoint_label_uri) {
          data = dataset || this.endpoint_loader;
          this.load_endpoint_data_and_show(endpoint_label_uri);
          this.update_browser_title(data);
          this.update_caption(data.value, data.endpoint_graph);
          return;
        }
        // Either dataset and ontologies are passed in by HuViz.load_with() from a command
        //   or this method is called with neither in which case get values from the loaders
        alreadyCommands = (this.gclui.command_list != null) && this.gclui.command_list.length;
        alreadyCommands = this.gclui.future_cmdArgs.length > 0;
        if (this.script_loader.value && !alreadyCommands) {
          scriptUri = this.script_loader.value;
          this.get_resource_from_db(scriptUri, this.load_script_from_db);
          return;
        }
        onto = ontologies && ontologies[0] || this.ontology_loader;
        data = dataset || this.dataset_loader;
        // at this point data and onto are both objects with a .value key, containing url or fname
        if (!(onto.value && data.value)) {
          console.debug(data, onto);
          throw new Error("Now whoa-up pardner... both data and onto should have .value");
        }
        this.load_data_with_onto(data, onto, this.after_visualize_dataset_using_ontology);
        this.update_browser_title(data);
        this.update_caption(data.value, onto.value);
      }

      after_visualize_dataset_using_ontology() {
        return this.preset_discover_geonames_remaining();
      }

      load_script_from_db(err, rsrcRec) {
        if (err != null) {
          return this.blurt(err, 'error');
        } else {
          return this.load_script_from_JSON(this.parse_script_file(rsrcRec.data, rsrcRec.uri));
        }
      }

      init_gclc() {
        var j, len1, pid, ref, results1;
        this.gclc = new GraphCommandLanguageCtrl(this);
        this.init_resource_menus();
        if (this.gclui == null) {
          // @oldToUniqueTabSel['huvis_controls'] ???
          this.gclui = new CommandController(this, d3.select(this.args.gclui_sel)[0][0], this.hierarchy);
        }
        window.addEventListener('showgraph', this.register_gclc_prefixes);
        window.addEventListener('newpredicate', this.gclui.handle_newpredicate);
        if (!this.show_class_instance_edges) {
          TYPE_SYNS.forEach((pred_id, i) => {
            return this.gclui.ignore_predicate(pred_id);
          });
        }
        NAME_SYNS.forEach((pred_id, i) => {
          return this.gclui.ignore_predicate(pred_id);
        });
        ref = this.predicates_to_ignore;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          pid = ref[j];
          results1.push(this.gclui.ignore_predicate(pid));
        }
        return results1;
      }

      disable_dataset_ontology_loader(data, onto) {
        var disable;
        this.replace_loader_display(data, onto);
        disable = true;
        this.update_go_button(disable);
        this.dataset_loader.disable();
        this.ontology_loader.disable();
        return this.big_go_button.hide();
      }

      reset_dataset_ontology_loader() {
        $('#' + this.get_data_ontology_display_id()).remove();
        //Enable dataset loader and reset to default setting
        this.dataset_loader.enable();
        this.ontology_loader.enable();
        this.big_go_button.show();
        $(`#${this.dataset_loader.select_id} option[label='Pick or Provide...']`).prop('selected', true);
        return this.gclui_JQElem.removeAttr("style", "display:none");
      }

      update_dataset_ontology_loader() {
        var ugb;
        if (!((this.dataset_loader != null) && (this.ontology_loader != null) && (this.endpoint_loader != null) && (this.script_loader != null))) {
          console.log("still building loaders...");
          return;
        }
        this.set_ontology_from_dataset_if_possible();
        ugb = () => {
          return this.update_go_button();
        };
        return setTimeout(ugb, 200);
      }

      update_endpoint_form(e) {
        var graphSelector;
        //check if there are any endpoint selections available
        graphSelector = `#sparqlGraphOptions-${e.currentTarget.id}`;
        $(graphSelector).change(this.update_graph_form);
        if (e.currentTarget.value === '') {
          $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', false);
          $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', false);
          $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', false);
          $(graphSelector).parent().css('display', 'none');
          return this.reset_endpoint_form(false);
        } else if (e.currentTarget.value === 'provide') {
          return console.log("update_endpoint_form ... select PROVIDE");
        } else {
          this.sparql_graph_query_and_show(e.currentTarget.value, e.currentTarget.id);
          //console.log @dataset_loader
          $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
          $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
          return $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
        }
      }

      reset_endpoint_form(show) {
        var spinner;
        spinner = $(`#sparqlGraphSpinner-${this.endpoint_loader.select_id}`);
        spinner.css('display', 'none');
        this.endpoint_labels_JQElem.prop('disabled', false).val("");
        this.endpoint_limit_JQElem.prop('disabled', false).val("100");
        if (show) {
          return this.sparqlQryInput_show();
        } else {
          return this.sparqlQryInput_hide();
        }
      }

      update_go_button(disable) {
        var ds_on, ds_v, on_v;
        if (disable == null) {
          if (this.script_loader.value) {
            disable = false;
          } else if ((this.endpoint_loader != null) && this.endpoint_loader.value) {
            disable = false;
          } else {
            ds_v = this.dataset_loader.value;
            on_v = this.ontology_loader.value;
            //console.log("DATASET: #{ds_v}\nONTOLOGY: #{on_v}")
            disable = (!(ds_v && on_v)) || ('provide' === ds_v || 'provide' === on_v);
            ds_on = `${ds_v} AND ${on_v}`;
          }
        }
        this.big_go_button.prop('disabled', disable);
      }

      get_reload_uri() {
        return this.reload_uri || new URL(window.location);
      }

      generate_reload_uri(dataset, ontology) {
        var uri;
        this.reload_uri = uri = new URL(location);
        uri.hash = `load+${dataset.value}+with+${ontology.value}`;
        return uri;
      }

      get_data_ontology_display_id() {
        if (this.data_ontology_display_id == null) {
          this.data_ontology_display_id = this.unique_id('datontdisp_');
        }
        return this.data_ontology_display_id;
      }

      hide_pickers() {
        return $(this.pickersSel).attr("style", "display:none");
      }

      replace_loader_display(dataset, ontology) {
        var controls, data_ontol_display, sel, uri;
        this.generate_reload_uri(dataset, ontology);
        uri = this.get_reload_uri();
        this.hide_pickers();
        data_ontol_display = `<div id="${this.get_data_ontology_display_id()}" class="data_ontology_display">\n  <p><span class="dt_label">Dataset:</span> ${dataset.label}</p>\n  <p><span class="dt_label">Ontology:</span> ${ontology.label}</p>\n  <p>\n    <button title="Reload this data"\n       onclick="location.replace('${uri
        // """ the extra set of triple double quotes is for emacs coffescript mode
}');location.reload()"><i class="fas fa-redo"></i></button>\n    <button title="Clear the graph and start over"\n       onclick="location.assign(location.origin)"><i class="fas fa-times"></i></button>\n  </p>\n  <br style="clear:both">\n</div>`;
        sel = this.oldToUniqueTabSel['huvis_controls'];
        controls = document.querySelector(sel);
        controls.insertAdjacentHTML('afterbegin', data_ontol_display);
      }

      replace_loader_display_for_endpoint(endpoint, graph) {
        var data_ontol_display, print_graph;
        $(this.pickersSel).attr("style", "display:none");
        //uri = new URL(location)
        //uri.hash = "load+#{dataset.value}+with+#{ontology.value}"
        if (graph) {
          print_graph = `<p><span class='dt_label'>Graph:</span> ${graph}</p>`;
        } else {
          print_graph = "";
        }
        data_ontol_display = `<div id="${this.get_data_ontology_display_id()}">\n  <p><span class="dt_label">Endpoint:</span> ${endpoint}</p>\n  ${print_graph}\n  <br style="clear:both">\n</div>`;
        return $("#huvis_controls").prepend(data_ontol_display);
      }

      update_browser_title(dataset) {
        if (dataset.value) {
          return document.title = dataset.label + " - Huvis Graph Visualization";
        }
      }

      make_git_link() {
        var base;
        base = this.args.git_base_url;
        return `<a class="git_commit_hash_watermark subliminal"\ntarget="huviz_version"  tabindex="-1"\nhref="${base}${this.git_commit_hash}">${this.git_commit_hash
// """
}</a>`;
      }

      create_caption() {
        var dm, om;
        this.captionId = this.unique_id('caption_');
        this.addDivWithIdAndClasses(this.captionId, "graph_title_set git_commit_hash_watermark");
        this.captionElem = document.querySelector('#' + this.captionId);
        if (this.git_commit_hash) {
          this.insertBeforeEnd(this.captionElem, this.make_git_link());
        }
        dm = 'dataset_watermark';
        this.insertBeforeEnd(this.captionElem, `<div class="${dm
        // """
} subliminal"></div>`);
        this.make_JQElem(dm, this.args.huviz_top_sel + ' .' + dm); // @dataset_watermark_JQElem
        om = 'ontology_watermark';
        this.insertBeforeEnd(this.captionElem, `<div class="${om
        // """
} subliminal"></div>`);
        this.make_JQElem(om, this.args.huviz_top_sel + ' .' + om); // @ontology_watermark_JQElem
      }

      update_caption(dataset_str, ontology_str) {
        this.dataset_watermark_JQElem.text(dataset_str);
        this.ontology_watermark_JQElem.text(ontology_str);
      }

      set_ontology_from_dataset_if_possible() {
        var ontologyUri, ontology_label, option;
        if (this.dataset_loader.value) { // and not @ontology_loader.value
          option = this.dataset_loader.get_selected_option();
          ontologyUri = option.data('ontologyUri');
          ontology_label = option.data('ontology_label'); //default set in group json file
          if (ontologyUri) { // let the uri (if present) dominate the label
            this.set_ontology_with_uri(ontologyUri);
          } else {
            this.set_ontology_with_label(ontology_label);
          }
        }
        return this.ontology_loader.update_state();
      }

      set_ontology_with_label(ontology_label) {
        var j, len1, ont_opt, ref, sel, topSel;
        topSel = this.args.huviz_top_sel;
        sel = topSel + ` [label='${ontology_label}']`;
        ref = $(sel);
        // FIXME make this re-entrant
        for (j = 0, len1 = ref.length; j < len1; j++) {
          ont_opt = ref[j];
          this.ontology_loader.select_option($(ont_opt));
          return;
        }
      }

      set_dataset_with_uri(uri) {
        var option, topSel;
        topSel = this.args.huviz_top_sel;
        option = $(topSel + ' option[value="' + uri + '"]');
        return this.dataset_loader.select_option(option);
      }

      set_ontology_with_uri(ontologyUri) {
        var ontology_option, topSel;
        topSel = this.args.huviz_top_sel;
        ontology_option = $(topSel + ' option[value="' + ontologyUri + '"]');
        return this.ontology_loader.select_option(ontology_option);
      }

      build_sparql_form() {
        var endpoint_labels_id, endpoint_limit_id, fromGraph, select_box, sparqlQryInput_id;
        this.sparqlId = unique_id();
        sparqlQryInput_id = `sparqlQryInput_${this.sparqlId}`;
        this.sparqlQryInput_selector = "#" + sparqlQryInput_id;
        endpoint_limit_id = unique_id('endpoint_limit_');
        endpoint_labels_id = unique_id('endpoint_labels_');
        select_box = `<div class='ui-widget' style='display:none;margin-top:5px;margin-left:10px;'>\n  <label>Graphs: </label>\n  <select id="sparqlGraphOptions-${this.endpoint_loader.select_id}">\n  </select>\n</div>\n<div id="sparqlGraphSpinner-${this.endpoint_loader.select_id}"\n     style='display:none;font-style:italic;'>\n  <i class='fas fa-spinner fa-spin' style='margin: 10px 10px 0 50px;'></i>  Looking for graphs...\n</div>\n<div id="${sparqlQryInput_id}" class="ui-widget sparqlQryInput"\n     style='display:none;margin-top:5px;margin-left:10px;color:#999;'>\n  <label for='${endpoint_labels_id}'>Find: </label>\n  <input id='${endpoint_labels_id}'>\n  <i class='fas fa-spinner fa-spin' style='visibility:hidden;margin-left: 5px;'></i>\n  <div><label for='${endpoint_limit_id}'>Node Limit: </label>\n  <input id='${endpoint_limit_id
        // """
}' value='100'>\n  </div>\n</div>`;
        $(this.pickersSel).append(select_box);
        this.sparqlQryInput_JQElem = $(this.sparqlQryInput_selector);
        this.endpoint_labels_JQElem = $('#' + endpoint_labels_id);
        this.endpoint_limit_JQElem = $('#' + endpoint_limit_id);
        fromGraph = '';
        return this.endpoint_labels_JQElem.autocomplete({
          minLength: 3,
          delay: 500,
          position: {
            collision: "flip"
          },
          source: this.populate_graphs_selector
        });
      }

      populate_graphs_selector(request, response) {
        var ajax_settings, fromGraph, qry, spinner, url;
        spinner = this.endpoint_labels_JQElem.siblings('i');
        spinner.css('visibility', 'visible');
        url = this.endpoint_loader.value;
        fromGraph = '';
        if (this.endpoint_loader.endpoint_graph) {
          fromGraph = ` FROM <${this.endpoint_loader.endpoint_graph}> `;
        }
        qry = `      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n      PREFIX foaf: <http://xmlns.com/foaf/0.1/>\n      SELECT * ${fromGraph}\n      WHERE {\n?sub rdfs:label|foaf:name ?obj .\n      filter contains(?obj,"${request.term
        // " # for emacs syntax hilighting
}")\n      }\n      LIMIT 20`;
        ajax_settings = {
          'method': 'GET',
          'url': url + '?query=' + encodeURIComponent(qry),
          'headers': {
            'Accept': 'application/sparql-results+json'
          }
        };
        if (url === "http://sparql.cwrc.ca/sparql") { // Hack to make CWRC setup work properly
          ajax_settings.headers = {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
          };
        }
        return $.ajax({
          method: ajax_settings.method, // "type" used in eariler jquery
          url: ajax_settings.url,
          headers: ajax_settings.headers,
          success: (data, textStatus, jqXHR) => {
            var j, json_check, json_data, label, len1, results, selections, this_result;
            //console.log jqXHR
            //console.log data
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            results = json_data.results.bindings;
            selections = [];
            for (j = 0, len1 = results.length; j < len1; j++) {
              label = results[j];
              this_result = {
                label: label.obj.value + ` (${label.sub.value})`,
                value: label.sub.value
              };
              selections.push(this_result);
              spinner.css('visibility', 'hidden');
            }
            return response(selections);
          },
          //@parse_json_label_query_results(data)
          error: (jqxhr, textStatus, errorThrown) => {
            var msg;
            console.log(url, errorThrown);
            console.log(textStatus);
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + url;
            this.hide_state_msg();
            $('#' + this.get_data_ontology_display_id()).remove();
            this.endpoint_labels_JQElem.siblings('i').css('visibility', 'hidden');
            return this.blurt(msg, 'error');
          }
        });
      }

      init_editc_or_not() {
        if (this.editui == null) {
          this.editui = new EditController(this);
        }
        this.editui.id = 'EditUI';
        this.editui.transit('prepare');
        if (this.args.show_edit) {
          this.editui.show();
        } else {
          this.editui.hide();
        }
        if (this.args.start_with_editing) {
          return this.editui.transit('enable');
        }
      }

      indexed_dbservice() {
        return this.indexeddbservice != null ? this.indexeddbservice : this.indexeddbservice = new IndexedDBService(this);
      }

      init_indexddbstorage() {
        return this.dbsstorage != null ? this.dbsstorage : this.dbsstorage = new IndexedDBStorageController(this, this.indexeddbservice);
      }

      get_polar_coords_of(node) {
        var degrees, h, max_radius, min_wh, radians, range, w, x, y;
        w = this.get_container_height();
        h = this.get_container_width();
        min_wh = Math.min(w, h);
        max_radius = min_wh / 2;
        max_radius = this.graph_region_radius;
        x = node.x - this.cx;
        y = node.y - this.cy;
        range = Math.sqrt((x * x) + (y * y)) / max_radius;
        radians = Math.atan2(y, x) + Math.PI; // + (Math.PI/2)
        degrees = (Math.floor(radians * 180 / Math.PI) + 270) % 360;
        return {
          range: range,
          degrees: degrees
        };
      }

      run_verb_on_object(verb, subject) {
        var args, cmd;
        args = {
          verbs: [verb],
          subjects: [this.get_handle(subject)]
        };
        if (verb === 'pin') {
          args.polar_coords = this.get_polar_coords_of(subject);
        }
        cmd = new gcl.GraphCommand(this, args);
        return this.run_command(cmd);
      }

      before_running_command() {
        // FIXME fix non-display of cursor and color changes
        return this.text_cursor.set_cursor("wait");
      }

      //$("body").css "background-color", "red" # FIXME remove once it works!
      //toggle_suspend_updates(true)
      after_running_command() {
        //toggle_suspend_updates(false)
        this.text_cursor.set_cursor("default");
        //$("body").css "background-color", renderStyles.pageBg # FIXME remove once it works!
        //$("body").addClass renderStyles.themeName
        this.topElem.style.backgroundColor = renderStyles.pageBg;
        this.topElem.classList.add(renderStyles.themeName);
        this.update_all_counts();
        return this.clean_up_all_dirt_once();
      }

      get_handle(thing) {
        return {
          // A handle is like a weak reference, saveable, serializable
          // and garbage collectible.  It was motivated by the desire to
          // turn an actual node into a suitable member of the subjects list
          // on a GraphCommand
          id: thing.id,
          lid: thing.lid
        };
      }

      toggle_logging() {
        var new_state;
        if (console.log_real == null) {
          console.log_real = console.log;
        }
        new_state = console.log === console.log_real;
        return this.set_logging(new_state);
      }

      set_logging(new_state) {
        if (new_state) {
          console.log = console.log_real;
          return true;
        } else {
          console.log = function() {};
          return false;
        }
      }

      create_state_msg_box() {
        this.state_msg_box = $("#state_msg_box");
        return this.hide_state_msg();
      }

      //console.info @state_msg_box
      init_ontology() {
        this.create_taxonomy();
        return this.ontology = PRIMORDIAL_ONTOLOGY;
      }

      get_default_tab(id) {
        var j, len1, ref, tab;
        ref = this.default_tab_specs;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          tab = ref[j];
          if (tab.id === id) {
            return tab;
          }
        }
        return {
          id: id,
          title: id,
          cssClass: id,
          text: id
        };
      }

      make_tabs_html() {
        var firstClass, firstClass_, html, id, idSel, j, jQElem_list, len1, mkcb, t, tab_specs, theDivs, theTabs;
        // The firstClass in cssClass acts like a re-entrant identifier for these
        // tabs. Each also gets a unique id.
        // Purpose:
        //   Programmatically build the equivalent of views/tabs/all.ejs but with
        //   unique ids for the divs
        // Notes:
        //   When @args.use_old_tabs_ids is true this method reproduces all.ejs exactly.
        //   Otherwise it gives each div a unique id
        //   Either way @oldToUniqueTabSel provides a way to select each tab using
        //       the old non-reentrant ids like 'tabs-intro'
        // Arguments:
        //   cssClass becomes the value of the class attribute of the div
        //   title becomes the title attribute of the tab
        //   text becomes the visible label of the tab
        //   moveSelector: (optional) the selector of content to move into the div
        //   bodyUrl: (optional) is the url of content to insert into the div
        //       (if it ends with .md the markdown is rendered)
        // Motivation:
        //   The problem this is working to solve is that we want HuViz to
        //   be re-entrant (ie more than one instance per page) but it was
        //   originally written without that in mind, using unique ids such
        //   as #tabs-intro liberally.  This method provides a way to
        //   programmatically build the tabs with truly unique ids but also
        //   with a way to learn what those ids are using the old
        //   identifiers.  To finish the task of transforming the code to
        //   be re-entrant we must:
        //     1) find all the places which use ids such as "#gclui" or
        //        "#tabs-history" and get them to use @oldToUniqueTabSel
        //        as a lookup for the new ids.
        //     2) rebuild the CSS to use class names such as ".gclui" rather
        //        than the old ids such as "#gclui"
        jQElem_list = []; // a list of args for the command @make_JQElem()
        theTabs = "<ul class=\"the-tabs\">";
        theDivs = "";
        tab_specs = this.args.tab_specs;
        for (j = 0, len1 = tab_specs.length; j < len1; j++) {
          t = tab_specs[j];
          if (typeof t === 'string') {
            t = this.get_default_tab(t);
          }
          firstClass = t.cssClass.split(' ')[0];
          firstClass_ = firstClass.replace(/\-/, '_');
          id = this.unique_id(firstClass + '_');
          if (this.args.use_old_tab_ids) {
            id = firstClass;
          }
          idSel = '#' + id;
          this.oldToUniqueTabSel[firstClass] = idSel;
          theTabs += `<li><a href="${idSel}" title="${t.title}">${t.text}</a></li>`;
          theDivs += `<div id="${id}" class="${t.cssClass}">${t.kids || ''}</div>`;
          if (typeof marked === "undefined" || marked === null) {
            console.info('marked does not exist yet');
          }
          if (t.bodyUrl != null) {
            this.withUriDo(t.bodyUrl, idSel);
          }
          if (t.moveSelector != null) {
            mkcb = (fromSel, toSel) => { // make closure
              return () => {
                return this.moveSelToSel(fromSel, toSel);
              };
            };
            setTimeout(mkcb(t.moveSelector, idSel), 30);
          }
          jQElem_list.push([
            firstClass_,
            idSel // queue up args for execution by @make_JQElem()
          ]);
        }
        theTabs += "</ul>";
        this.tabs_id = this.unique_id('tabs_');
        html = [`<section id="${this.tabs_id}" class="huviz_tabs" role="controls">`, theTabs, theDivs, "</section>"].join('');
        return [html, jQElem_list];
      }

      moveSelToSel(moveSel, targetSel) {
        var moveElem, targetElem;
        if (!(moveElem = document.querySelector(moveSel))) {
          console.warn(`moveSelector() failed to find moveSel: '${moveSel}'`);
          return;
        }
        if (!(targetElem = document.querySelector(targetSel))) {
          console.warn(`moveSelector() failed to find targetSel: '${targetSel}'`);
          return;
        }
        targetElem.appendChild(moveElem);
      }

      withUriDo(url, sel, processor) {
        var xhr;
        xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = (e) => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              if (processor == null) {
                processor = (url.endsWith('.md') && marked) || ident;
              }
              return this.renderIntoWith(xhr.responseText, sel, processor);
            } else {
              return console.error(xhr.statusText);
            }
          }
        };
        xhr.onerror = function(e) {
          return console.error(xhr.statusText);
        };
        return xhr.send(null);
      }

      renderIntoWith(data, sel, processor) {
        var elem;
        elem = document.querySelector(sel);
        if (!elem) {
          return;
        }
        if (processor != null) {
          elem.innerHTML = processor(data);
        } else {
          elem.innerHTML = data;
        }
      }

      insertBeforeEnd(elem, html) {
        var position;
        position = 'beforeend';
        elem.insertAdjacentHTML(position, html);
        return elem.lastElementChild; // note, this only works right if html has one outer elem
      }

      create_tabs() {
        var elem, html, j, jQElem_list, len1, pair;
        if (!this.args.tab_specs) {
          return;
        }
        // create <section id="tabs"...> programmatically, making unique ids along the way
        elem = document.querySelector(this.args.create_tabs_adjacent_to_selector);
        [html, jQElem_list] = this.make_tabs_html();
        this.addHTML(html);
        for (j = 0, len1 = jQElem_list.length; j < len1; j++) {
          pair = jQElem_list[j];
          this.make_JQElem(pair[0], pair[1]);
        }
      }

      ensureTopElem() {
        var body, classes, id;
        if (!document.querySelector(this.args.huviz_top_sel)) {
          body = document.querySelector("body");
          id = sel_to_id(this.args.huviz_top_sel);
          classes = 'huviz_top';
          this.addDivWithIDAndClasses(id, classes, body);
        }
        //@insertBeforeEnd(body, """<div id="#{@args.huviz_top_sel}"></div>""")
        this.topElem = document.querySelector(this.args.huviz_top_sel);
        this.topJQElem = $(this.topElem);
      }

      get_picker_style_context_selector() {
        // The selector of the context which the picker's colors are constrained to.
        // What?  To keep the colors which any ColorTreePickers create confined to
        // this particular HuViz instance.
        return this.args.huviz_top_sel;
      }

      addHTML(html) {
        return this.insertBeforeEnd(this.topElem, html);
      }

      addDivWithIdAndClasses(id, classes, specialElem) {
        var html;
        html = `<div id="${sel_to_id(id)}" class="${classes}"></div>`;
        if (specialElem) {
          return this.insertBeforeEnd(specialElem, html);
        } else {
          return this.addHTML(html);
        }
      }

      ensure_divs() {
        var classes, elem, id, j, key, key_sel, len1, ref, sel, specialParent, specialParentElem, specialParentSel, specialParentSelKey;
        ref = this.needed_divs;
        // find the unique id for things like viscanvas and make div if missing
        for (j = 0, len1 = ref.length; j < len1; j++) {
          key = ref[j];
          key_sel = key + '_sel';
          if ((sel = this.args[key_sel])) {
            id = sel_to_id(sel);
            classes = key;
            if (!(elem = document.querySelector(sel))) {
              specialParentElem = null; // indicates the huviz_top div
              if ((specialParent = this.div_has_special_parent[key])) {
                specialParentSelKey = specialParent + '_sel';
                if ((specialParentSel = this.args[specialParentSelKey]) || (specialParentSel = this.oldToUniqueTabSel[specialParent])) {
                  specialParentElem = document.querySelector(specialParentSel);
                }
              }
              this.addDivWithIdAndClasses(id, classes, specialParentElem);
            }
          }
        }
      }

      make_JQElem(key, sel) {
        var found, jqelem_id;
        jqelem_id = key + '_JQElem';
        found = $(sel);
        if (found.length > 0) {
          this[jqelem_id] = found;
        } else {
          throw new Error(sel + ' not found');
        }
      }

      make_JQElems() {
        var j, key, len1, ref, sel;
        ref = this.needed_JQElems;
        // Make jQuery elems like @viscanvas_JQElem and performance_dashboard_JQElem
        for (j = 0, len1 = ref.length; j < len1; j++) {
          key = ref[j];
          if ((sel = this.args[key + '_sel'])) {
            this.make_JQElem(key, sel);
          }
        }
      }

      // TODO create default_args from needed_divs (or something)
      make_default_args() {
        return {
          // these must be made on the fly for reentrancy
          add_to_HVZ: true,
          ctrl_handle_sel: unique_id('#ctrl_handle_'),
          gclui_sel: unique_id('#gclui_'),
          git_base_url: "https://github.com/smurp/huviz/commit/",
          hide_fullscreen_button: false,
          huviz_top_sel: unique_id('#huviz_top_'), // if not provided then create
          make_pickers: true,
          performance_dashboard_sel: unique_id('#performance_dashboard_'),
          settings: {},
          show_edit: false,
          show_tabs: true,
          skip_log_tick: true,
          state_msg_box_sel: unique_id('#state_msg_box_'),
          status_sel: unique_id('#status_'),
          stay_square: false,
          tab_specs: [
            'commands',
            'settings',
            'history' // things break if these are not present
          ],
          tabs_minWidth: 300,
          use_old_tab_ids: false,
          viscanvas_sel: unique_id('#viscanvas_'),
          vissvg_sel: unique_id('#vissvg_')
        };
      }

      calculate_args(incoming_args) {
        var args;
        // overlay incoming over defaults to make the composition
        if (incoming_args == null) {
          incoming_args = {};
        }
        if (!incoming_args.huviz_top_sel) {
          console.warn('you have not provided a value for huviz_top_sel so it will be appended to BODY');
        }
        args = this.compose_object_from_defaults_and_incoming(this.make_default_args(), incoming_args);
        // calculate some args from others
        if (args.create_tabs_adjacent_to_selector == null) {
          args.create_tabs_adjacent_to_selector = args.huviz_top_sel;
        }
        return args;
      }

      constructor(incoming_args) { // Huviz
        var base1, search_input;
        this.like_string = this.like_string.bind(this);
        this.mousemove = this.mousemove.bind(this);
        this.mousedown = this.mousedown.bind(this);
        this.mouseup = this.mouseup.bind(this);
        this.mouseright = this.mouseright.bind(this);
        this.updateWindow = this.updateWindow.bind(this);
        this.get_charge = this.get_charge.bind(this);
        this.get_gravity = this.get_gravity.bind(this);
        this.tick = this.tick.bind(this);
        this.hide_state_msg = this.hide_state_msg.bind(this);
        this.discovery_triple_ingestor_N3 = this.discovery_triple_ingestor_N3.bind(this);
        this.discovery_triple_ingestor_GreenTurtle = this.discovery_triple_ingestor_GreenTurtle.bind(this);
        this.make_triple_ingestor = this.make_triple_ingestor.bind(this);
        this.discover_labels = this.discover_labels.bind(this);
        this.ingest_quads_from = this.ingest_quads_from.bind(this);
        this.show_geonames_instructions = this.show_geonames_instructions.bind(this);
        this.parseAndShowTTLData = this.parseAndShowTTLData.bind(this);
        this.parseAndShowTurtle = this.parseAndShowTurtle.bind(this);
        this.choose_everything = this.choose_everything.bind(this);
        this.parse_and_show_NQ_file = this.parse_and_show_NQ_file.bind(this);
        this.DUMPER = this.DUMPER.bind(this);
        this.sparql_graph_query_and_show = this.sparql_graph_query_and_show.bind(this);
        this.update_searchterm = this.update_searchterm.bind(this);
        this.clean_up_dirty_predicates = this.clean_up_dirty_predicates.bind(this);
        this.clean_up_all_dirt = this.clean_up_all_dirt.bind(this);
        this.shelve = this.shelve.bind(this);
        this.choose = this.choose.bind(this);
        this.unchoose = this.unchoose.bind(this);
        this.wander__atFirst = this.wander__atFirst.bind(this);
        this.wander__atLast = this.wander__atLast.bind(this);
        this.wander = this.wander.bind(this);
        this.walk = this.walk.bind(this);
        this.hide = this.hide.bind(this);
        this.select = this.select.bind(this);
        this.unselect = this.unselect.bind(this);
        this.animate_hunt = this.animate_hunt.bind(this);
        this.hunt = this.hunt.bind(this);
        this.clear_snippets = this.clear_snippets.bind(this);
        this.peek = this.peek.bind(this);
        this.print = this.print.bind(this);
        this.redact = this.redact.bind(this);
        this.draw_edge_regarding = this.draw_edge_regarding.bind(this);
        this.undraw_edge_regarding = this.undraw_edge_regarding.bind(this);
        this.register_gclc_prefixes = this.register_gclc_prefixes.bind(this);
        this.ensure_datasets = this.ensure_datasets.bind(this);
        this.ensure_datasets_from_XHR = this.ensure_datasets_from_XHR.bind(this);
        this.update_graph_form = this.update_graph_form.bind(this);
        this.visualize_dataset_using_ontology = this.visualize_dataset_using_ontology.bind(this);
        this.after_visualize_dataset_using_ontology = this.after_visualize_dataset_using_ontology.bind(this);
        this.load_script_from_db = this.load_script_from_db.bind(this);
        this.update_dataset_ontology_loader = this.update_dataset_ontology_loader.bind(this);
        this.update_endpoint_form = this.update_endpoint_form.bind(this);
        this.reset_endpoint_form = this.reset_endpoint_form.bind(this);
        this.build_sparql_form = this.build_sparql_form.bind(this);
        this.populate_graphs_selector = this.populate_graphs_selector.bind(this);
        this.blurt = this.blurt.bind(this);
        this.close_blurt_box = this.close_blurt_box.bind(this);
        this.fullscreen = this.fullscreen.bind(this);
        //#### ------------------- collapse/expand stuff ---------------- ########
        this.collapse_tabs = this.collapse_tabs.bind(this);
        //@expandCtrlJQElem.show() # why does this not work instead of the above?
        this.expand_tabs = this.expand_tabs.bind(this);
        //checked: "checked"
        this.dump_current_settings = this.dump_current_settings.bind(this);
        this.init_settings_from_json = this.init_settings_from_json.bind(this);
        //$(@settingGroupsContainerElem).accordion()
        //@insertBeforeEnd(@settingsElem, """<div class="buffer_space"></div>""")
        this.update_settings_cursor = this.update_settings_cursor.bind(this);
        this.update_graph_settings = this.update_graph_settings.bind(this);
        this.change_graph_settings = this.change_graph_settings.bind(this);
        // TODO could it be that some of these need their handlers run? eg on_change_SOME_SETTING_NAME
        //@change_setting_to_from(setting, value)
        //console.warn("should adjust the Settings INPUT for #{setting} too")
        this.change_setting_to_from = this.change_setting_to_from.bind(this);
        this.pfm_dashboard = this.pfm_dashboard.bind(this);
        this.build_pfm_live_monitor = this.build_pfm_live_monitor.bind(this);
        this.pfm_count = this.pfm_count.bind(this);
        this.pfm_update = this.pfm_update.bind(this);
        this.oldToUniqueTabSel = {};
        //if @pfm_display is true
        //  @pfm_dashboard()
        this.git_commit_hash = window.HUVIZ_GIT_COMMIT_HASH;
        this.args = this.calculate_args(incoming_args);
        this.ensureTopElem();
        if (this.args.create_tabs_adjacent_to_selector) {
          this.create_tabs();
        }
        this.tabsJQElem = $('#' + this.tabs_id);
        if (!this.args.show_tabs) {
          this.collapse_tabs();
        }
        this.replace_human_term_spans(this.tabs_id);
        if (this.args.add_to_HVZ) {
          if (window.HVZ == null) {
            window.HVZ = [];
          }
          window.HVZ.push(this);
        }
        // FIXME Simplify this whole settings_sel and 'settings' thing
        //       The settings should just be built right on settings_JQElem
        if ((base1 = this.args).settings_sel == null) {
          base1.settings_sel = this.oldToUniqueTabSel['settings'];
        }
        this.create_blurtbox();
        this.ensure_divs();
        this.make_JQElems();
        this.create_collapse_expand_handles();
        if (!this.args.hide_fullscreen_button) {
          this.create_fullscreen_handle();
        }
        this.init_ontology();
        this.create_caption();
        this.off_center = false; // FIXME expose this or make the amount a slider
        document.addEventListener('nextsubject', this.onnextsubject);
        this.init_snippet_box(); // FIXME not sure this does much useful anymore
        this.mousedown_point = false;
        this.discard_point = [
          this.cx,
          this.cy // FIXME refactor so ctrl_handle handles this
        ];
        this.lariat_center = [
          this.cx,
          this.cy //       and this....
        ];
        this.node_radius_policy = node_radius_policies[default_node_radius_policy];
        this.currently_printed_snippets = {};
        this.fill = d3.scale.category20();
        this.force = d3.layout.force().size([this.width, this.height]).nodes([]).linkDistance(this.link_distance).charge(this.get_charge).gravity(this.gravity).on("tick", this.tick);
        this.update_fisheye();
        this.svg = d3.select(this.args.vissvg_sel).append("svg").attr("width", this.width).attr("height", this.height).attr("position", "absolute");
        this.svg.append("rect").attr("width", this.width).attr("height", this.height);
        this.container = d3.select(this.args.viscanvas_sel).node().parentNode;
        this.init_settings_from_json();
        this.apply_settings(this.args.settings);
        if (this.use_fancy_cursor) {
          this.text_cursor = new TextCursor(this.args.viscanvas_sel, "");
          this.install_update_pointer_togglers();
        }
        this.create_state_msg_box();
        this.viscanvas = d3.select(this.args.viscanvas_sel).html("").append("canvas").attr("width", this.width).attr("height", this.height);
        this.canvas = this.viscanvas[0][0];
        this.mouse_receiver = this.viscanvas;
        this.reset_graph();
        this.updateWindow();
        this.ctx = this.canvas.getContext("2d");
        //console.log @ctx
        this.mouse_receiver.on("mousemove", this.mousemove).on("mousedown", this.mousedown).on("mouseup", this.mouseup).on("contextmenu", this.mouseright);
        //.on("mouseout", @mouseup) # FIXME what *should* happen on mouseout?
        this.restart();
        this.set_search_regex("");
        search_input = document.getElementById('search');
        if (search_input) {
          search_input.addEventListener("input", this.update_searchterm);
        }
        window.addEventListener("resize", this.updateWindow);
        this.tabsJQElem.on("resize", this.updateWindow);
        $(this.viscanvas).bind("_splitpaneparentresize", this.updateWindow);
        this.tabsJQElem.tabs({
          active: 0
        });
        this.maybe_demo_round_img();
      }

      maybe_demo_round_img() {
        var e, roundImage;
        if (!this.args.demo_round_img) {
          return;
        }
        try {
          roundImage = this.get_or_create_round_img(this.args.demo_round_img);
          roundImage.id = this.unique_id('sample_round_img_');
          this.tabsJQElem.append(roundImage);
          $('#' + roundImage.id).attr("style", "background-color:black");
        } catch (error1) {
          e = error1;
          console.warn("url:", this.args.demo_round_img);
          console.debug(e);
        }
      }

      create_blurtbox() {
        var blurtbox_id, html, tabsElem;
        blurtbox_id = this.unique_id('blurtbox_');
        tabsElem = document.querySelector('#' + this.tabs_id);
        html = `<div id="${blurtbox_id}" class="blurtbox"></div>`;
        this.blurtbox_JQElem = $(this.insertBeforeEnd(tabsElem, html));
      }

      blurt(str, type, noButton) {
        var label;
        //css styles for messages: info (blue), alert (yellow), error (red)
        // TODO There is currently no way for users to remove blurt boxes

        //type='info' if !type
        if (type === "info") {
          label = "<h3>Message</h3>";
        }
        if (type === "alert") {
          label = "<h3>Alert</h3>";
        }
        if (type === "error") {
          label = "<h3>Error</h3>";
        }
        if (!type) {
          label = '';
        }
        this.blurtbox_JQElem.append(`<div class='blurt ${type}'>${label}${str}<br class='clear'></div>`);
        this.blurtbox_JQElem.scrollTop(10000);
        if (!noButton && !this.close_blurtbox_button) {
          this.close_blurtbox_button = this.blurtbox_JQElem.prepend("<button id='blurt_close' class='sml_bttn' type='button'>close</button>");
          this.close_blurtbox_button.on('click', this.close_blurt_box);
        }
      }

      close_blurt_box() {
        delete this.close_blurtbox_button;
        return this.blurtbox_JQElem.html('');
      }

      //#### ------------------- fullscreen stuff ---------------- ########
      create_fullscreen_handle() {
        var fs;
        fs = "<div class=\"full_screen\" style=\"position:absolute;z-index:999\"><i class=\"fa fa-arrows-alt\"></i></div>";
        this.topJQElem.prepend(fs);
        this.fullscreenJQElem = this.topJQElem.find(".full_screen");
        this.fullscreenJQElem.click(this.fullscreen);
      }

      fullscreen() {
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/exitFullscreen
        if (document.fullscreenElement) {
          return document.exitFullscreen();
        } else {
          return this.topElem.requestFullscreen();
        }
      }

      collapse_tabs() {
        this.tabsJQElem.prop('style', 'visibility:hidden;width:0');
        this.tabsJQElem.find('.expand_cntrl').prop('style', 'visibility:visible');
        this.tabsJQElem.find('.the-tabs').prop('style', 'display:none');
        return this.tabsJQElem.find('.tabs-intro').prop('style', 'display:none');
      }

      expand_tabs() {
        this.tabsJQElem.prop('style', 'visibility:visible');
        //@tabsJQElem.find('.expand_cntrl').prop('style','visibility:hidden')
        this.tabsJQElem.find('.the-tabs').prop('style', 'display:inherit');
        this.tabsJQElem.find('.tabs-intro').prop('style', 'display:inherit');
        this.expandCtrlJQElem.hide();
        return this.collapseCtrlJQElem.show();
      }

      create_collapse_expand_handles() {
        var ctrl_handle_id, html;
        ctrl_handle_id = sel_to_id(this.args.ctrl_handle_sel);
        html = `<div class="expand_cntrl" style="visibility:hidden">\n  <i class="fa fa-angle-double-left"></i></div>\n<div class="collapse_cntrl">\n  <i class="fa fa-angle-double-right"></i></div>\n<div id="${ctrl_handle_id
        // """ this comment is to help emacs coffeescript mode
}"\n     class="ctrl_handle ui-resizable-handle ui-resizable-w">\n   <div class="ctrl_handle_grip">o</div>\n</div>`;
        this.tabsJQElem.prepend(html);
        this.expandCtrlJQElem = this.tabsJQElem.find(".expand_cntrl");
        this.expandCtrlJQElem.click(this.expand_tabs).on("click", this.updateWindow);
        this.collapseCtrlJQElem = this.tabsJQElem.find(".collapse_cntrl");
        this.collapseCtrlJQElem.click(this.collapse_tabs).on("click", this.updateWindow);
        this.tabsJQElem.resizable({
          handles: {
            'w': this.args.ctrl_handle_sel
          },
          minWidth: this.args.tabs_minWidth
        });
      }

      //### ---------------------  Utilities ---------------------------- #######
      goto_tab(tab_idx) {
        this.tabsJQElem.tabs({
          active: tab_idx,
          collapsible: true
        });
      }

      update_fisheye() {
        //@label_show_range = @link_distance * 1.1
        this.label_show_range = 30 * 1.1; //TODO Fixed value or variable like original? (above)
        //@fisheye_radius = @label_show_range * 5
        this.focus_radius = this.label_show_range;
        this.fisheye = d3.fisheye.circular().radius(this.fisheye_radius).distortion(this.fisheye_zoom);
        this.force.linkDistance(this.link_distance).gravity(this.gravity);
        if (!this.args.skip_log_tick) {
          return console.log("Tick in @force.linkDistance... update_fisheye");
        }
      }

      replace_human_term_spans(optional_class) {
        var canonical, human, ref, results1, selector;
        optional_class = optional_class || 'a_human_term';
        ref = this.human_term;
        //if console and console.info
        //  console.info("doing addClass('#{optional_class}') on all occurrences of CSS class human_term__*")
        results1 = [];
        for (canonical in ref) {
          human = ref[canonical];
          selector = '.human_term__' + canonical;
          //console.log("replacing '#{canonical}' with '#{human}' in #{selector}")
          results1.push($(selector).text(human).addClass(optional_class)); //.style('color','red')
        }
        return results1;
      }

      dump_current_settings(post) {
        this.settings_JQElem.html('');
        this.init_settings_from_json();
        this.on_change_graph_title_style("subliminal");
        return this.on_change_prune_walk_nodes("directional_path");
      }

      auto_adjust_settings() {
        // Try to tune the gravity, charge and link length to suit the data and the canvas size.
        return this;
      }

      make_settings_group(groupName) {
        return this.insertBeforeEnd(this.settingGroupsContainerElem, `<h1>${groupName}</h1><div class="settingsGroup"></div>`);
      }

      get_or_create_settings_group(groupName) {
        var group, groupId;
        groupId = synthIdFor(groupName);
        if (this.settings_groups == null) {
          this.settings_groups = {};
        }
        group = this.settings_groups[groupName];
        if (!group) {
          this.settings_groups[groupName] = group = this.make_settings_group(groupName);
        }
        return group;
      }

      init_settings_from_json() {
        var WidgetClass, control, controlElem, control_name, control_spec, event_type, groupElem, groupName, inputElem, inputId, j, k, labelElem, len1, old_val, opt, optIdx, optionElem, ref, ref1, ref2, ref3, settings_input_sel, v, value;
        // TODO rebuild this method without D3 using @settingsElem
        this.settingsElem = document.querySelector(this.args.settings_sel);
        settings_input_sel = this.args.settings_sel + ' input';
        this.settings_cursor = new TextCursor(settings_input_sel, "");
        if (this.settings_cursor) {
          $(settings_input_sel).on("mouseover", this.update_settings_cursor);
        }
        //$("input").on("mouseenter", @update_settings_cursor)
        //$("input").on("mousemove", @update_settings_cursor)
        this.settings = d3.select(this.settingsElem);
        this.settings.classed('settings', true);
        this.settingGroupsContainerElem = this.insertBeforeEnd(this.settingsElem, '<div class="settingGroupsContainer"></div>');
        ref = this.default_settings;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          control_spec = ref[j];
          for (control_name in control_spec) {
            control = control_spec[control_name];
            inputId = unique_id(control_name + '_');
            groupName = control.group || 'General';
            groupElem = this.get_or_create_settings_group(groupName);
            controlElem = this.insertBeforeEnd(groupElem, `<div class="a_setting ${control_name}__setting"></div>`);
            labelElem = this.insertBeforeEnd(controlElem, `<label for="${inputId}"></label>`);
            if (control.text != null) {
              labelElem.innerHTML = control.text;
            }
            if (control.html_text != null) {
              labelElem.innerHTML = control.html_text;
            }
            if (control.style != null) {
              controlElem.setAttribute('style', control.style);
            }
            if (control.class != null) {
              //graph_control.attr('class', 'graph_control ' + control.class)
              //controlElem.addAttribute('class', control.class)
              controlElem.classList.add(control.class);
            }
            if (control.input != null) {
              if (control.input.type === 'select') {
                inputElem = this.insertBeforeEnd(controlElem, "<select></select>");
                ref1 = control.options;
                for (optIdx in ref1) {
                  opt = ref1[optIdx];
                  optionElem = this.insertBeforeEnd(inputElem, `<option value="${opt.value}"></option>`);
                  if (opt.selected) {
                    optionElem.setAttribute('selected', 'selected');
                  }
                  if (opt.label != null) {
                    optionElem.innerHTML = opt.label;
                  }
                }
              } else if (control.input.type === 'button') {
                inputElem = this.insertBeforeEnd(controlElem, "<button type=\"button\">(should set label)</button>");
                if (control.input.label != null) {
                  inputElem.innerHTML = control.input.label;
                }
                if (control.input.style != null) {
                  inputElem.setAttribute('style', control.input.style);
                }
                inputElem.onClick = this.dump_current_settings;
              } else {
                inputElem = this.insertBeforeEnd(controlElem, `<input name="${control_name}"></input>`);
                WidgetClass = null;
                ref2 = control.input;
                for (k in ref2) {
                  v = ref2[k];
                  if (k === 'jsWidgetClass') {
                    WidgetClass = v;
                    continue;
                  }
                  if (k === 'value') {
                    old_val = this[control_name];
                    this.change_setting_to_from(control_name, v, old_val);
                  }
                  inputElem.setAttribute(k, v);
                }
                if (WidgetClass) {
                  this[control_name + '__widget'] = new WidgetClass(this, inputElem);
                }
                if (control.input.type === 'checkbox') {
                  value = control.input.checked != null;
                  this.change_setting_to_from(control_name, value, void 0); //@[control_name].checked)
                }
              }
              // TODO replace control.event_type with autodetecting on_change_ vs on_update_ method existence
              inputElem.setAttribute('id', inputId);
              inputElem.setAttribute('name', control_name);
              event_type = control.event_type || (((ref3 = control.input.type) === 'checkbox' || ref3 === 'range' || ref3 === 'radio') && 'input') || 'change';
              if (event_type === 'change') {
                // These controls only update when enter is pressed or the focus changes.
                // Good for things like text fields which might not make sense until the user is 'done'.
                //input.on("change", @update_graph_settings)
                inputElem.addEventListener('change', this.change_graph_settings);
              } else {
                // These controls get continuously updated.
                // Good for range sliders, radiobuttons and checkboxes.
                // This can be forced by setting the .event_type on the control_spec explicitly.
                //input.on("input", @update_graph_settings) # continuous updates
                inputElem.addEventListener('input', this.update_graph_settings);
              }
            }
            if (control.label.title != null) {
              this.insertBeforeEnd(controlElem, '<div class="setting_explanation">' + control.label.title + '</div>');
            }
          }
        }
      }

      update_settings_cursor(evt) {
        var cursor_text;
        cursor_text = evt.target.value.toString();
        if (!cursor_text) {
          console.debug(cursor_text);
        } else {
          console.log(cursor_text);
        }
        return this.settings_cursor.set_text(cursor_text);
      }

      update_graph_settings(event) {
        return this.change_graph_settings(event, true);
      }

      change_graph_settings(event, update) {
        var asNum, cooked_value, old_value, target;
        target = event.target;
        if (update == null) {
          update = false;
        }
        if (target.type === "checkbox") {
          cooked_value = target.checked;
        } else if (target.type === "range") { // must massage into something useful
          asNum = parseFloat(target.value);
          cooked_value = ('' + asNum) !== 'NaN' && asNum || target.value;
        } else {
          cooked_value = target.value;
        }
        old_value = this[target.name];
        this.change_setting_to_from(target.name, cooked_value, old_value);
        //d3.select(target).attr("title", cooked_value)
        if (update) { // TODO be more discriminating, not all settings require update
          //   ones that do: charge, gravity, fisheye_zoom, fisheye_radius
          this.update_fisheye();
          this.updateWindow();
        }
        return this.tick("Tick in update_graph_settings");
      }

      apply_settings(settings) {
        var results1, setting, value;
        results1 = [];
        for (setting in settings) {
          value = settings[setting];
          results1.push(this.set_setting(setting, value));
        }
        return results1;
      }

      change_setting_to_from(setting_name, new_value, old_value, skip_custom_handler) {
        var cursor_text, custom_handler, custom_handler_name;
        skip_custom_handler = (skip_custom_handler != null) && skip_custom_handler || false;
        // TODO replace control.event_type with autodetecting on_change_ vs on_update_ method existence
        custom_handler_name = "on_change_" + setting_name;
        custom_handler = this[custom_handler_name];
        if (this.settings_cursor) {
          cursor_text = new_value.toString();
          //console.info("#{setting_name}: #{cursor_text}")
          this.settings_cursor.set_text(cursor_text);
        }
        if ((custom_handler != null) && !skip_custom_handler) {
          //console.log "change_setting_to_from() custom setting: #{setting_name} to:#{new_value}(#{typeof new_value}) from:#{old_value}(#{typeof old_value})"
          return custom_handler.apply(this, [new_value, old_value]);
        } else {
          //console.log "change_setting_to_from() setting: #{setting_name} to:#{new_value}(#{typeof new_value}) from:#{old_value}(#{typeof old_value})"
          return this[setting_name] = new_value;
        }
      }

      // on_change handlers for the various settings which need them
      on_change_use_accordion_for_settings(new_val, old_val) {
        var doit;
        if (new_val) {
          // TODO replace this delay with a promise
          doit = () => {
            return $(this.settingGroupsContainerElem).accordion();
          };
          return setTimeout(doit, 200);
        } else {
          return console.warn('We do not yet have a solution for turning OFF the Accordion');
        }
      }

      on_change_nodes_pinnable(new_val, old_val) {
        var j, len1, node, ref, results1;
        if (!new_val) {
          if (this.graphed_set) {
            ref = this.graphed_set;
            results1 = [];
            for (j = 0, len1 = ref.length; j < len1; j++) {
              node = ref[j];
              results1.push(node.fixed = false);
            }
            return results1;
          }
        }
      }

      on_change_show_hunt_verb(new_val, old_val) {
        var vset;
        if (new_val) {
          vset = {
            hunt: this.human_term.hunt
          };
          this.gclui.verb_sets.push(vset);
          return this.gclui.add_verb_set(vset);
        }
      }

      on_change_show_dangerous_datasets(new_val, old_val) {
        if (new_val) {
          $('option.dangerous').show();
          return $('option.dangerous').text(function(idx, text) {
            var append;
            append = ' (!)';
            if (!text.match(/\(\!\)$/)) {
              return text + append;
            }
            return text;
          });
        } else {
          return $('option.dangerous').hide();
        }
      }

      on_change_pill_display(new_val) {
        if (new_val) {
          node_display_type = 'pills';
          $("input[name='charge']").attr('min', '-5000').attr('value', '-3000');
          $("input[name='link_distance']").attr('max', '500').attr('value', '200');
          this.charge = -3000;
          this.link_distance = 200;
        } else {
          node_display_type = "";
          $("input[name='charge']").attr('min', '-600').attr('value', '-200');
          $("input[name='link_distance']").attr('max', '200').attr('value', '29');
          this.charge = -200;
          this.link_distance = 29;
        }
        return this.updateWindow();
      }

      on_change_theme_colors(new_val) {
        if (new_val) {
          renderStyles = themeStyles.dark;
          //$("body").removeClass themeStyles.light.themeName
          this.topElem.classList.remove(themeStyles.light.themeName);
        } else {
          renderStyles = themeStyles.light;
          //$("body").removeClass themeStyles.dark.themeName
          this.topElem.classList.remove(themeStyles.light.themeName);
        }
        //@update_graph_settings()
        //$("body").css "background-color", renderStyles.pageBg
        //$("body").addClass renderStyles.themeName
        this.topElem.style.backgroundColor = renderStyles.pageBg;
        this.topElem.classList.add(renderStyles.themeName);
        console.log(this.topElem);
        return this.updateWindow();
      }

      on_change_display_label_cartouches(new_val) {
        if (new_val) {
          this.cartouches = true;
        } else {
          this.cartouches = false;
        }
        return this.updateWindow();
      }

      on_change_display_shelf_clockwise(new_val) {
        if (new_val) {
          this.display_shelf_clockwise = true;
        } else {
          this.display_shelf_clockwise = false;
        }
        return this.updateWindow();
      }

      on_change_choose_node_display_angle(new_val) {
        nodeOrderAngle = new_val;
        return this.updateWindow();
      }

      on_change_shelf_radius(new_val, old_val) {
        this.change_setting_to_from('shelf_radius', new_val, old_val, true);
        this.update_graph_radius();
        return this.updateWindow();
      }

      on_change_truncate_labels_to(new_val, old_val) {
        var j, len1, node, ref;
        this.change_setting_to_from('truncate_labels_to', new_val, old_val, true);
        if (this.all_set) {
          ref = this.all_set;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            node = ref[j];
            this.unscroll_pretty_name(node);
          }
        }
        return this.updateWindow();
      }

      on_change_graph_title_style(new_val, old_val) {
        var custSubTitle, custTitle;
        if (new_val === "custom") {
          this.topJQElem.find(".main_title").removeAttr("style");
          this.topJQElem.find(".sub_title").removeAttr("style");
          this.topJQElem.find(".graph_custom_main_title__setting").css('display', 'inherit');
          this.topJQElem.find(".graph_custom_sub_title__setting").css('display', 'inherit');
          custTitle = this.topJQElem.find("input[name='graph_custom_main_title']");
          custSubTitle = this.topJQElem.find("input[name='graph_custom_sub_title']");
          this.update_caption(custTitle[0].title, custSubTitle[0].title);
          this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'none');
          this.ontology_watermark_JQElem.attr('style', '');
        } else if (new_val === "bold1") {
          this.ontology_watermark_JQElem.css('display', 'none');
        } else {
          this.topJQElem.find(".graph_custom_main_title__setting").css('display', 'none');
          this.topJQElem.find(".graph_custom_sub_title__setting").css('display', 'none');
          this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'inherit');
          this.ontology_watermark_JQElem.attr('style', '');
          this.update_caption(this.data_uri, this.onto_uri);
        }
        this.dataset_watermark_JQElem.removeClass().addClass(`dataset_watermark ${new_val}`);
        return this.ontology_watermark_JQElem.removeClass().addClass(`ontology_watermark ${new_val}`);
      }

      on_change_graph_custom_main_title(new_val) {
        // if new custom values then update titles
        return this.dataset_watermark_JQElem.text(new_val);
      }

      on_change_graph_custom_sub_title(new_val) {
        return this.ontology_watermark_JQElem.text(new_val);
      }

      on_change_language_path(new_val, old_val) {
        var e, ref;
        try {
          MultiString.set_langpath(new_val);
        } catch (error1) {
          e = error1;
          alert(`Input: ${new_val}\n${e.toString()}\n\n  The 'Language Path' should be a colon-separated list of ISO two-letter language codes, such as 'en' or 'fr:en:es'.  One can also include the keywords ANY, NOLANG or ALL in the list.\n  'ANY' means show a value from no particular language and works well in situations where you don't know or care which language is presented.\n  'NOLANG' means show a value for which no language was specified.\n  'ALL' causes all the different language versions to be revealed. It is best used alone\n\nExamples (show first available, so order matters)\n  en:fr\n    show english or french or nothing\n  en:ANY:NOLANG\n    show english or ANY other language or language-less label\n  ALL\n    show all versions available, language-less last`);
          this.change_setting_to_from('language_path', old_val, old_val);
          return;
        }
        if (this.shelved_set) {
          this.shelved_set.resort();
          this.discarded_set.resort();
        }
        this.update_labels_on_pickers();
        if ((ref = this.gclui) != null) {
          ref.resort_pickers();
        }
        if (this.ctx != null) {
          this.tick("Tick in on_change_language_path");
        }
      }

      on_change_color_nodes_as_pies(new_val, old_val) { // TODO why this == window ??
        this.color_nodes_as_pies = new_val;
        return this.recolor_nodes();
      }

      on_change_prune_walk_nodes(new_val, old_val) {
        return this.prune_walk_nodes = new_val;
      }

      on_change_show_hide_endpoint_loading(new_val, old_val) {
        var endpoint;
        if (this.endpoint_loader) {
          endpoint = "#" + this.endpoint_loader.uniq_id;
        }
        if (new_val && endpoint) {
          return $(endpoint).css('display', 'block');
        } else {
          return $(endpoint).css('display', 'none');
        }
      }

      on_change_show_hide_performance_monitor(new_val, old_val) {
        console.log("clicked performance monitor " + new_val + " " + old_val);
        if (new_val) {
          this.performance_dashboard_JQElem.css('display', 'block');
          this.pfm_display = true;
          this.pfm_dashboard();
          return this.timerId = setInterval(this.pfm_update, 1000);
        } else {
          clearInterval(this.timerId);
          this.performance_dashboard_JQElem.css('display', 'none').html('');
          return this.pfm_display = false;
        }
      }

      on_change_discover_geonames_remaining(new_val, old_val) {
        this.discover_geonames_remaining = parseInt(new_val, 10);
        return this.discover_names_including('sws.geonames.org');
      }

      on_change_discover_geonames_as(new_val, old_val) {
        this.discover_geonames_as = new_val;
        if (new_val) {
          this.discover_geonames_as__widget.set_state('untried');
          return this.discover_names_including('sws.geonames.org');
        } else {
          if (this.discover_geonames_as__widget) {
            return this.discover_geonames_as__widget.set_state('empty');
          }
        }
      }

      on_change_single_chosen(new_val, old_val) {
        this.single_chosen = new_val;
        return this.tick();
      }

      on_change_arrows_chosen(new_val, old_val) {
        this.arrows_chosen = new_val;
        return this.tick();
      }

      init_from_settings() {
        var elem, j, len1, ref, results1;
        ref = $(".settings input");
        // so we can modify them in a loop
        // alert "init_from_settings() is deprecated"
        // Perform update_graph_settings for everything in the form
        // so the HTML can be used as configuration file
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          elem = ref[j];
          results1.push(this.update_graph_settings(elem, false));
        }
        return results1;
      }

      after_file_loaded(uri, callback) {
        this.call_on_dataset_loaded(uri);
        if (callback) {
          return callback();
        }
      }

      show_node_pred_edge_stats() {
        var edge_count, pred_count, s;
        pred_count = 0;
        edge_count = 0;
        s = `nodes:${this.nodes.length} predicates:${pred_count} edges:${edge_count}`;
        return console.log(s);
      }

      call_on_dataset_loaded(uri) {
        return this.gclui.on_dataset_loaded({
          uri: uri
        });
      }

      XXX_load_file() {
        return this.load_data_with_onto(this.get_dataset_uri());
      }

      load_data_with_onto(data, onto, callback) { // Used for loading files from menu
        // data and onto are expected to have .value containing an url; full, relative or filename
        // regardless the .value is a key into the datasetDB
        this.data_uri = data.value;
        this.set_ontology(onto.value);
        this.onto_uri = onto.value;
        if (this.args.display_reset) {
          $("#reset_btn").show();
        } else {
          //@disable_data_set_selector()
          this.disable_dataset_ontology_loader(data, onto);
        }
        this.show_state_msg("loading...");
        //@init_from_settings() # REVIEW remove init_from_settings?!?
        //@dump_current_settings("after init_from_settings()")
        //@reset_graph()
        this.show_state_msg(this.data_uri);
        if (!this.G.subjects) {
          return this.fetchAndShow(this.data_uri, callback);
        }
      }

      disable_data_set_selector() {
        $("[name=data_set]").prop('disabled', true);
        return $("#reload_btn").show();
      }

      XXX_read_data_and_show(filename, data) { //Handles drag-and-dropped files
        var the_parser;
        // REVIEW is this no longer used?
        data = this.local_file_data;
        //console.log data
        if (filename.match(/.ttl$/)) {
          the_parser = this.parseAndShowTTLData;
        } else if (filename.match(/.nq$/)) {
          the_parser = this.parse_and_show_NQ_file;
        } else {
          alert(`Unknown file format. Unable to parse '${filename}'. Only .ttl and .nq files supported.`);
          return;
        }
        the_parser(data);
        //@local_file_data = "" #RESET the file data
        //@disable_data_set_selector()
        return this.disable_dataset_ontology_loader();
      }

      //@show_state_msg("loading...")
      //@show_state_msg filename
      get_dataset_uri() {
        // FIXME goodbye jquery
        return $("select.file_picker option:selected").val();
      }

      run_script_from_hash() {
        var script;
        script = this.get_script_from_hash();
        if (script != null) {
          this.gclui.run_script(script);
        }
      }

      get_script_from_hash() {
        var script;
        script = location.hash;
        script = ((script == null) || script === "#") && "" || script.replace(/^#/, "");
        script = script.replace(/\+/g, " ");
        if (script) {
          colorlog("get_script_from_hash() script: " + script);
        }
        return script;
      }

      adjust_menus_from_load_cmd(cmd) {
        // Adjust the dataset and ontology loaders to match the cmd
        if (cmd.ontologies && cmd.ontologies.length > 0 && !this.ontology_loader.value) {
          this.set_ontology_with_uri(cmd.ontologies[0]);
          if (cmd.data_uri && !this.dataset_loader.value) {
            this.set_dataset_with_uri(cmd.data_uri);
            return true;
          }
        }
        return false;
      }

      load_script_from_JSON(json) {
        var cmdArgs, j, len1, saul_goodman;
        //alert('load_script_from_JSON')
        saul_goodman = false;
        for (j = 0, len1 = json.length; j < len1; j++) {
          cmdArgs = json[j];
          if (indexOf.call(cmdArgs.verbs, 'load') >= 0) {
            saul_goodman = this.adjust_menus_from_load_cmd(cmdArgs);
          } else {
            this.gclui.push_cmdArgs_onto_future(cmdArgs);
          }
        }
      }

      parse_script_file(data, fname) {
        var line, lines;
        // There are two file formats, both with the extension .txt
        //   1) * Commands as they appear in the Command History
        //      * Followed by the comment on a line of its own
        //      * Followed by the .json version of the script, for trivial parsing
        //   2) Commands as they appear in the Command History
        // The thinking is that, ultimately, version 1) will be required until the
        // parser for the textual version is complete.
        lines = data.split('\n');
        while (lines.length) {
          line = lines.shift();
          if (line.includes(this.json_script_marker)) {
            return JSON.parse(lines.join("\n"));
          }
        }
        return {};
      }

      boot_sequence(script) {
        var data_uri;
        // If we are passed an empty string that means there was an outer
        // script but there was nothing for us and DO NOT examine the hash for more.
        // If there is a script after the hash, run it.
        // Otherwise load the default dataset defined by the page.
        // Or load nothing if there is no default.
        this.reset_graph();
        if (script == null) {
          script = this.get_script_from_hash();
        }
        if ((script != null) && script.length) {
          console.log(`boot_sequence('${script}')`);
          return this.gclui.run_script(script);
        } else {
          data_uri = this.get_dataset_uri();
          if (data_uri) {
            return this.load(data_uri);
          }
        }
      }

      load(data_uri, callback) {
        if (!this.G.subjects) {
          this.fetchAndShow(data_uri, callback);
        }
        if (this.use_webgl) {
          return this.init_webgl();
        }
      }

      load_with(data_uri, ontology_uris) {
        var basename, dataset, ontology;
        this.goto_tab(1); // go to Commands tab # FIXME: should be symbolic not int indexed
        basename = function(uri) {
          return uri.split('/').pop().split('.').shift(); // the filename without the ext
        };
        dataset = {
          label: basename(data_uri),
          value: data_uri
        };
        ontology = {
          label: basename(ontology_uris[0]),
          value: ontology_uris[0]
        };
        this.visualize_dataset_using_ontology({}, dataset, [ontology]);
      }

      // TODO: remove now that @get_or_create_node_by_id() sets type and name
      is_ready(node) {
        // Determine whether there is enough known about a node to make it visible
        // Does it have an .id and a .type and a .name?
        return (node.id != null) && (node.type != null) && (node.name != null);
      }

      assign_types(node, within) {
        var type_id;
        type_id = node.type; // FIXME one of type or taxon_id gotta go, bye 'type'
        if (type_id) {
          //console.log "assign_type",type_id,"to",node.id,"within",within,type_id
          return this.get_or_create_taxon(type_id).register(node);
        } else {
          throw "there must be a .type before hatch can even be called:" + node.id + " " + type_id;
        }
      }

      //console.log "assign_types failed, missing .type on",node.id,"within",within,type_id
      is_big_data() {
        var ref;
        if (this.big_data_p == null) {
          //if @nodes.length > 200
          if ((ref = this.data_uri) != null ? ref.match('poetesses|relations') : void 0) {
            this.big_data_p = true;
          } else {
            this.big_data_p = false;
          }
        }
        return this.big_data_p;
      }

      get_default_set_by_type(node) {
        var ref;
        // see Orlando.get_default_set_by_type
        //console.log "get_default_set_by_type",node
        if (this.is_big_data()) {
          if ((ref = node.type) === 'writer') {
            return this.shelved_set;
          } else {
            return this.hidden_set;
          }
        }
        return this.shelved_set;
      }

      get_default_set_by_type(node) {
        return this.shelved_set;
      }

      pfm_dashboard() {
        var message, warning;
        // Adding feedback monitor
        //   1. new instance in pfm_data (line 541)
        //   2. add @pfm_count('name') to method
        //   3. add #{@build_pfm_live_monitor('name')} into message below
        warning = "";
        message = `<div class='feedback_module'><p>Triples Added: <span id="noAddQuad">0</span></p></div>\n<div class='feedback_module'><p>Number of Nodes: <span id="noN">0</span></p></div>\n<div class='feedback_module'><p>Number of Edges: <span id="noE">0</span></p></div>\n<div class='feedback_module'><p>Number of Predicates: <span id="noP">0</span></p></div>\n<div class='feedback_module'><p>Number of Classes: <span id="noC">0</span></p></div>\n${this.build_pfm_live_monitor('add_quad')}\n${this.build_pfm_live_monitor('hatch')}\n<div class='feedback_module'><p>Ticks in Session: <span id="noTicks">0</span></p></div>\n${this.build_pfm_live_monitor('tick')}\n<div class='feedback_module'><p>Total SPARQL Requests: <span id="noSparql">0</span></p></div>\n<div class='feedback_module'><p>Outstanding SPARQL Requests: <span id="noOR">0</span></p></div>\n${this.build_pfm_live_monitor('sparql')}`;
        return this.performance_dashboard_JQElem.html(message + warning);
      }

      build_pfm_live_monitor(name) {
        var label, monitor;
        label = this.pfm_data[`${name}`]["label"];
        monitor = `<div class='feedback_module'>${label}: <svg id='pfm_${name}' class='sparkline' width='200px' height='50px' stroke-width='1'></svg></div>`;
        return monitor;
      }

      pfm_count(name) {
        // Incriment the global count for 'name' variable (then used to update live counters)
        return this.pfm_data[`${name}`].total_count++;
      }

      pfm_update() {
        var calls_per_second, class_count, item, marker, new_count, noE, noN, noOR, noP, old_count, pfm_marker, results1, time;
        time = Date.now();
        class_count = 0;
        // update static markers
        if (this.nodes) {
          noN = this.nodes.length;
        } else {
          noN = 0;
        }
        $("#noN").html(`${noN}`);
        if (this.edge_count) {
          noE = this.edge_count;
        } else {
          noE = 0;
        }
        $("#noE").html(`${noE}`);
        if (this.predicate_set) {
          noP = this.predicate_set.length;
        } else {
          noP = 0;
        }
        $("#noP").html(`${noP}`);
//TODO Should improve this by avoiding recount every second
        for (item in this.taxonomy) {
          class_count++;
        }
        this.pfm_data.taxonomy.total_count = class_count;
        $("#noC").html(`${this.pfm_data.taxonomy.total_count}`);
        $("#noTicks").html(`${this.pfm_data.tick.total_count}`);
        $("#noAddQuad").html(`${this.pfm_data.add_quad.total_count}`);
        $("#noSparql").html(`${this.pfm_data.sparql.total_count}`);
        if (this.endpoint_loader) {
          noOR = this.endpoint_loader.outstanding_requests;
        } else {
          noOR = 0;
        }
        $("#noOR").html(`${noOR}`);
        results1 = [];
        for (pfm_marker in this.pfm_data) {
          marker = this.pfm_data[`${pfm_marker}`];
          old_count = marker.prev_total_count;
          new_count = marker.total_count;
          calls_per_second = Math.round(new_count - old_count);
          if (this.pfm_data[`${pfm_marker}`]["timed_count"] && (this.pfm_data[`${pfm_marker}`]["timed_count"].length > 0)) {
            //console.log marker.label + "  " + calls_per_second
            if (this.pfm_data[`${pfm_marker}`]["timed_count"].length > 60) {
              this.pfm_data[`${pfm_marker}`]["timed_count"].shift();
            }
            this.pfm_data[`${pfm_marker}`].timed_count.push(calls_per_second);
            this.pfm_data[`${pfm_marker}`].prev_total_count = new_count + 0.01;
            //console.log "#pfm_#{pfm_marker}"
            results1.push(sparkline.sparkline(document.querySelector(`#pfm_${pfm_marker}`), this.pfm_data[`${pfm_marker}`].timed_count));
          } else if (this.pfm_data[`${pfm_marker}`]["timed_count"]) {
            results1.push(this.pfm_data[`${pfm_marker}`]["timed_count"] = [0.01]);
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }

    };

    Huviz.prototype.class_list = [];

    Huviz.prototype.HHH = {};

    Huviz.prototype.edges_by_id = {};

    Huviz.prototype.edge_count = 0;

    Huviz.prototype.snippet_db = {};

    Huviz.prototype.class_index = {};

    Huviz.prototype.hierarchy = {};

    Huviz.prototype.default_color = "brown";

    Huviz.prototype.DEFAULT_CONTEXT = 'http://universal.org/';

    Huviz.prototype.turtle_parser = 'GreenerTurtle';

    //turtle_parser: 'N3'
    Huviz.prototype.use_canvas = true;

    Huviz.prototype.use_svg = false;

    Huviz.prototype.use_webgl = false;

    //use_webgl: true  if location.hash.match(/webgl/)
    //use_canvas: false  if location.hash.match(/nocanvas/)
    Huviz.prototype.nodes = void 0;

    Huviz.prototype.links_set = void 0;

    Huviz.prototype.node = void 0;

    Huviz.prototype.link = void 0;

    Huviz.prototype.lariat = void 0;

    Huviz.prototype.verbose = true;

    Huviz.prototype.verbosity = 0;

    Huviz.prototype.TEMP = 5;

    Huviz.prototype.COARSE = 10;

    Huviz.prototype.MODERATE = 20;

    Huviz.prototype.DEBUG = 40;

    Huviz.prototype.DUMP = false;

    Huviz.prototype.node_radius_policy = void 0;

    Huviz.prototype.draw_circle_around_focused = true;

    Huviz.prototype.draw_lariat_labels_rotated = true;

    Huviz.prototype.run_force_after_mouseup_msec = 2000;

    Huviz.prototype.nodes_pinnable = true;

    Huviz.prototype.BLANK_HACK = false;

    Huviz.prototype.width = void 0;

    Huviz.prototype.height = 0;

    Huviz.prototype.cx = 0;

    Huviz.prototype.cy = 0;

    Huviz.prototype.snippet_body_em = .7;

    Huviz.prototype.snippet_triple_em = .8;

    Huviz.prototype.line_length_min = 4;

    // TODO figure out how to replace with the default_graph_control
    Huviz.prototype.link_distance = 29;

    Huviz.prototype.fisheye_zoom = 4.0;

    Huviz.prototype.peeking_line_thicker = 4;

    Huviz.prototype.show_snippets_constantly = false;

    Huviz.prototype.charge = -193;

    Huviz.prototype.gravity = 0.025;

    Huviz.prototype.snippet_count_on_edge_labels = true;

    Huviz.prototype.label_show_range = null; // @link_distance * 1.1

    Huviz.prototype.focus_threshold = 100;

    Huviz.prototype.discard_radius = 200;

    Huviz.prototype.fisheye_radius = 300; //null # label_show_range * 5

    Huviz.prototype.focus_radius = null; // label_show_range

    Huviz.prototype.drag_dist_threshold = 5;

    Huviz.prototype.snippet_size = 300;

    Huviz.prototype.dragging = false;

    Huviz.prototype.last_status = void 0;

    Huviz.prototype.edge_x_offset = 5;

    Huviz.prototype.shadow_offset = 1;

    Huviz.prototype.shadow_color = 'DarkGray';

    Huviz.prototype.my_graph = {
      predicates: {},
      subjects: {},
      objects: {}
    };

    // required by green turtle, should be retired
    Huviz.prototype.G = {};

    Huviz.prototype.local_file_data = "";

    Huviz.prototype.search_regex = new RegExp("^$", "ig");

    Huviz.prototype.node_radius = 3.2;

    Huviz.prototype.mousedown_point = false;

    Huviz.prototype.discard_center = [0, 0];

    Huviz.prototype.lariat_center = [0, 0];

    Huviz.prototype.last_mouse_pos = [0, 0];

    renderStyles = themeStyles.light;

    Huviz.prototype.display_shelf_clockwise = true;

    nodeOrderAngle = 0.5;

    node_display_type = '';

    Huviz.prototype.pfm_display = false;

    Huviz.prototype.pfm_data = {
      tick: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Ticks/sec."
      },
      add_quad: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Add Quad/sec"
      },
      hatch: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Hatch/sec"
      },
      taxonomy: {
        total_count: 0,
        label: "Number of Classes:"
      },
      sparql: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Sparql Queries/sec"
      }
    };

    Huviz.prototype.p_total_sprql_requests = 0;

    Huviz.prototype.default_dialog_args = {
      width: 200,
      height: 200,
      left: 100,
      top: 100,
      head_bg_color: 'blue',
      classes: "contextMenu temp"
    };

    Huviz.prototype.DEPRECATED_showing_links_to_cursor_map = {
      all: 'not-allowed',
      some: 'all-scroll',
      none: 'pointer'
    };

    Huviz.proposed_edge = null; //initialization (no proposed edge active)

    Huviz.prototype.shown_messages = [];

    Huviz.prototype.msg_history = "";

    Huviz.prototype.my_graph = {
      subjects: {},
      predicates: {},
      objects: {}
    };

    Huviz.prototype.discover_geoname_name_msgs_threshold_ms = 5 * 1000; // msec betweeen repetition of a msg display

    
    // TODO eliminate all use of this version in favor of the markdown version
    Huviz.prototype.discover_geoname_name_instructions = "Be sure to\n  1) create a\n     <a target=\"geonamesAcct\"\n        href=\"http://www.geonames.org/login\">new account</a>\n  2) validate your email\n  3) on\n     <a target=\"geonamesAcct\"\n        href=\"http://www.geonames.org/manageaccount\">manage account</a>\n     press\n     <a target=\"geonamesAcct\"\n         href=\"http://www.geonames.org/enablefreewebservice\">click here to enable</a>\n 4) re-enter your GeoNames Username in HuViz settings to trigger lookup</span>";

    Huviz.prototype.discover_geoname_name_instructions_md = "## How to get GeoNames lookup working\n\n[GeoNames](http://www.geonames.org) is a very popular service experiencing much load.\nTo protect their servers they require a username to be able to perform lookup.\nThe hourly limit is 1000 and the daily limit is 30000 per username.\n\nYou may use the `huviz` username if you are going to perform just a couple of lookups.\nIf you are going to do lots of GeoNames lookups you should set up your own account.\nHere is how:\n\n1. create a <a target=\"geonamesAcct\" href=\"http://www.geonames.org/login\">new account</a> if you don't have one\n2. validate your email (if you haven't already)\n3. on the <a target=\"geonamesAcct\" href=\"http://www.geonames.org/manageaccount\">manage account</a> page\n   press <a target=\"geonamesAcct\" href=\"http://www.geonames.org/enablefreewebservice\">Click here to enable</a>\n   if your account is not already _enabled to use the free web services_\n4. enter your *GeoNames Username* in HuViz `Settings` tab then press the TAB or ENTER key to trigger lookup\n5. if you need to perform more lookups, just adjust the *GeoNames Limit*, then leave that field with TAB, ENTER or a click\n\n(Soon, HuViz will let you save your personal *GeoNames Username* and your *GeoNames Limit* to make this more convenient.)\n";

    /*
        "fcode" : "RGN",
        "adminCodes1" : {
           "ISO3166_2" : "ENG"
        },
        "adminName1" : "England",
         "countryName" : "United Kingdom",
        "fcl" : "L",
        "countryId" : "2635167",
        "adminCode1" : "ENG",
        "name" : "Yorkshire",
        "lat" : "53.95528",
        "population" : 0,
        "geonameId" : 8581589,
        "fclName" : "parks,area, ...",
        "countryCode" : "GB",
        "fcodeName" : "region",
        "toponymName" : "Yorkshire",
        "lng" : "-1.16318"
    */
    Huviz.prototype.discover_geoname_key_to_predicate_mapping = {
      name: RDFS_label,
      //toponymName: RDFS_label
      //lat: 'http://dbpedia.org/property/latitude'
      //lng: 'http://dbpedia.org/property/longitude'
      //fcodeName: RDF_literal
      population: 'http://dbpedia.org/property/population'
    };

    Huviz.prototype.last_quad = {};

    // add_quad is the standard entrypoint for all data sources
    // It is fires the events:
    //   newsubject
    Huviz.prototype.object_value_types = {};

    Huviz.prototype.unique_pids = {};

    Huviz.prototype.scroll_spacer = "   ";

    Huviz.prototype.report_every = 100; // if 1 then more data shown

    Huviz.prototype.snippet_positions_filled = {};

    // TODO make other than 'anything' optional
    Huviz.prototype.predicates_to_ignore = ["anything", "first", "rest", "members"];

    Huviz.prototype.default_tab_specs = [
      {
        id: 'commands',
        cssClass: 'huvis_controls scrolling_tab unselectable',
        title: "Power tools for controlling the graph",
        text: "Commands"
      },
      {
        id: 'settings',
        cssClass: 'settings scrolling_tab',
        title: "Fine tune sizes, lengths and thicknesses",
        text: "Settings"
      },
      {
        id: 'history',
        cssClass: 'tabs-history',
        title: "The command history",
        text: "History"
      },
      {
        id: 'credits',
        cssClass: 'tabs-credit scrolling_tab',
        title: "Academic, funding and technical credit",
        text: "Credit",
        bodyUrl: "/huviz/docs/credits.md"
      },
      {
        id: 'tutorial',
        cssClass: "tabs-tutor scrolling_tab",
        title: "A tutorial",
        text: "Tutorial",
        bodyUrl: "/huviz/docs/tutorial.md"
      }
    ];

    // The div on the left should be placed in the div on the right
    // The div on the left should appear in needed_divs.
    // The div on right should be identified by a tab id like 'huvis_controls'
    //                                    or by a div id like 'viscanvas'
    // Divs which do not have a 'special_parent' get plunked in the @topElem
    Huviz.prototype.div_has_special_parent = {
      gclui: 'huvis_controls'
    };

    Huviz.prototype.needed_divs = ['gclui', 'performance_dashboard', 'state_msg_box', 'status', 'viscanvas', 'vissvg'];

    Huviz.prototype.needed_JQElems = ['gclui', 'performance_dashboard', 'viscanvas', 'huviz_controls'];

    Huviz.prototype.human_term = {
      all: 'ALL',
      chosen: 'CHOSEN',
      unchosen: 'UNCHOSEN',
      selected: 'SELECTED',
      shelved: 'SHELVED',
      discarded: 'DISCARDED',
      hidden: 'HIDDEN',
      graphed: 'GRAPHED',
      fixed: 'PINNED',
      labelled: 'LABELLED',
      choose: 'CHOOSE',
      unchoose: 'UNCHOOSE',
      select: 'SELECT',
      unselect: 'UNSELECT',
      label: 'LABEL',
      unlabel: 'UNLABEL',
      shelve: 'SHELVE',
      hide: 'HIDE',
      discard: 'DISCARD',
      undiscard: 'RETRIEVE',
      pin: 'PIN',
      unpin: 'UNPIN',
      unpinned: 'UNPINNED',
      nameless: 'NAMELESS',
      blank_verb: 'VERB',
      blank_noun: 'SET/SELECTION',
      hunt: 'HUNT',
      walk: 'WALK',
      walked: 'WALKED',
      wander: 'WANDER',
      draw: 'DRAW',
      undraw: 'UNDRAW',
      connect: 'CONNECT',
      spawn: 'SPAWN',
      specialize: 'SPECIALIZE',
      annotate: 'ANNOTATE'
    };

    // TODO add controls
    //   selected_border_thickness
    Huviz.prototype.default_settings = [
      {
        reset_controls_to_default: {
          label: {
            title: "Reset all controls to default"
          },
          input: {
            type: "button",
            label: "Reset All"
          }
        }
      },
      {
        //style: "background-color: #303030"
        use_accordion_for_settings: {
          text: "show Settings in accordion",
          label: {
            title: "Show the Settings Groups as an 'Accordion'"
          },
          input: {
            //checked: "checked"
            type: "checkbox"
          }
        }
      },
      {
        //style: "display:none"
        focused_mag: {
          group: "Labels",
          text: "focused label mag",
          input: {
            value: 1.4,
            min: 1,
            max: 3,
            step: .1,
            type: 'range'
          },
          label: {
            title: "the amount bigger than a normal label the currently focused one is"
          }
        }
      },
      {
        selected_mag: {
          group: "Labels",
          text: "selected node mag",
          input: {
            value: 1.5,
            min: 0.5,
            max: 4,
            step: .1,
            type: 'range'
          },
          label: {
            title: "the amount bigger than a normal node the currently selected ones are"
          }
        }
      },
      {
        label_em: {
          group: "Labels",
          text: "label size (em)",
          label: {
            title: "the size of the font"
          },
          input: {
            value: .9,
            min: .1,
            max: 4,
            step: .05,
            type: 'range'
          }
        }
      },
      {
        //snippet_body_em:
        //  text: "snippet body (em)"
        //  label:
        //    title: "the size of the snippet text"
        //  input:
        //    value: .7
        //    min: .2
        //    max: 4
        //    step: .1
        //    type: "range"
        //,
        snippet_triple_em: {
          group: "Labels",
          text: "snippet triple (em)",
          label: {
            title: "the size of the snippet triples"
          },
          input: {
            value: .5,
            min: .2,
            max: 4,
            step: .1,
            type: "range"
          }
        }
      },
      {
        charge: {
          group: "Layout",
          text: "charge (-)",
          label: {
            title: "the repulsive charge betweeen nodes"
          },
          input: {
            value: -210,
            min: -600,
            max: -1,
            step: 1,
            type: "range"
          }
        }
      },
      {
        gravity: {
          group: "Layout",
          text: "gravity",
          label: {
            title: "the attractive force keeping nodes centered"
          },
          input: {
            value: 0.50,
            min: 0,
            max: 1,
            step: 0.025,
            type: "range"
          }
        }
      },
      {
        shelf_radius: {
          group: "Sizing",
          text: "shelf radius",
          label: {
            title: "how big the shelf is"
          },
          input: {
            value: 0.8,
            min: 0.1,
            max: 3,
            step: 0.05,
            type: "range"
          }
        }
      },
      {
        fisheye_zoom: {
          group: "Sizing",
          text: "fisheye zoom",
          label: {
            title: "how much magnification happens"
          },
          input: {
            value: 6.0,
            min: 1,
            max: 20,
            step: 0.2,
            type: "range"
          }
        }
      },
      {
        fisheye_radius: {
          group: "Sizing",
          text: "fisheye radius",
          label: {
            title: "how big the fisheye is"
          },
          input: {
            value: 300,
            min: 0,
            max: 2000,
            step: 20,
            type: "range"
          }
        }
      },
      {
        node_radius: {
          group: "Sizing",
          text: "node radius",
          label: {
            title: "how fat the nodes are"
          },
          input: {
            value: 3,
            min: 0.5,
            max: 50,
            step: 0.1,
            type: "range"
          }
        }
      },
      {
        node_diff: {
          group: "Sizing",
          text: "node differentiation",
          label: {
            title: "size variance for node edge count"
          },
          input: {
            value: 1,
            min: 0,
            max: 10,
            step: 0.1,
            type: "range"
          }
        }
      },
      {
        focus_threshold: {
          group: "Sizing",
          text: "focus threshold",
          label: {
            title: "how fine is node recognition"
          },
          input: {
            value: 20,
            min: 10,
            max: 150,
            step: 1,
            type: "range"
          }
        }
      },
      {
        link_distance: {
          group: "Layout",
          text: "link distance",
          label: {
            title: "how long the lines are"
          },
          input: {
            value: 29,
            min: 5,
            max: 200,
            step: 2,
            type: "range"
          }
        }
      },
      {
        edge_width: {
          group: "Sizing",
          text: "line thickness",
          label: {
            title: "how thick the lines are"
          },
          input: {
            value: 0.2,
            min: 0.2,
            max: 10,
            step: .2,
            type: "range"
          }
        }
      },
      {
        line_edge_weight: {
          group: "Sizing",
          text: "line edge weight",
          label: {
            title: "how much thicker lines become to indicate the number of snippets"
          },
          input: {
            value: 0.45,
            min: 0,
            max: 1,
            step: 0.01,
            type: "range"
          }
        }
      },
      {
        swayfrac: {
          group: "Sizing",
          text: "sway fraction",
          label: {
            title: "how much curvature lines have"
          },
          input: {
            value: 0.22,
            min: -1.0,
            max: 1.0,
            step: 0.01,
            type: "range"
          }
        }
      },
      {
        label_graphed: {
          group: "Labels",
          text: "label graphed nodes",
          style: "display:none",
          label: {
            title: "whether graphed nodes are always labelled"
          },
          input: {
            //checked: "checked"
            type: "checkbox"
          }
        }
      },
      {
        truncate_labels_to: {
          group: "Labels",
          text: "truncate and scroll",
          label: {
            title: "truncate and scroll labels longer than this, or zero to disable"
          },
          input: {
            value: 0, // 40
            min: 0,
            max: 60,
            step: 1,
            type: "range"
          }
        }
      },
      {
        snippet_count_on_edge_labels: {
          group: "Labels",
          text: "snippet count on edge labels",
          label: {
            title: "whether edges have their snippet count shown as (#)"
          },
          input: {
            //checked: "checked"
            type: "checkbox"
          }
        }
      },
      {
        nodes_pinnable: {
          style: "display:none",
          text: "nodes pinnable",
          label: {
            title: "whether repositioning already graphed nodes pins them at the new spot"
          },
          input: {
            checked: "checked",
            type: "checkbox"
          }
        }
      },
      {
        use_fancy_cursor: {
          style: "display:none",
          text: "use fancy cursor",
          label: {
            title: "use custom cursor"
          },
          input: {
            checked: "checked",
            type: "checkbox"
          }
        }
      },
      {
        doit_asap: {
          style: "display:none",
          text: "DoIt ASAP",
          label: {
            title: "execute commands as soon as they are complete"
          },
          input: {
            checked: "checked", // default to 'on'
            type: "checkbox"
          }
        }
      },
      {
        show_dangerous_datasets: {
          style: "display:none",
          text: "Show dangerous datasets",
          label: {
            title: "Show the datasets which are too large or buggy"
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        pill_display: {
          group: "Labels",
          text: "Display graph with boxed labels",
          label: {
            title: "Show boxed labels on graph"
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        //checked: "checked"
        theme_colors: {
          group: "Styling",
          text: "Display graph with dark theme",
          label: {
            title: "Show graph plotted on a black background"
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        display_label_cartouches: {
          group: "Styling",
          text: "Background cartouches for labels",
          label: {
            title: "Remove backgrounds from focused labels"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      },
      {
        display_shelf_clockwise: {
          group: "Styling",
          text: "Display nodes clockwise",
          label: {
            title: "Display clockwise (uncheck for counter-clockwise)"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      },
      {
        choose_node_display_angle: {
          group: "Styling",
          text: "Node display angle",
          label: {
            title: "Where on shelf to place first node"
          },
          input: {
            value: 0.5,
            min: 0,
            max: 1,
            step: 0.25,
            type: "range"
          }
        }
      },
      {
        language_path: {
          group: "Ontological",
          text: "Language Path",
          label: {
            title: "Using ':' as separator and with ANY and NOLANG as possible values,\na list of the languages to expose, in order of preference.\nExamples: \"en:fr\" means show English before French or nothing;\n\"ANY:en\" means show any language before showing English;\n\"en:ANY:NOLANG\" means show English if available, then any other\nlanguage, then finally labels in no declared language."
          },
          input: {
            type: "text",
            // TODO tidy up -- use browser default language then English
            value: (window.navigator.language.substr(0,
      2) + ":en:ANY:NOLANG").replace("en:en:",
      "en:"),
            size: "16",
            placeholder: "en:es:fr:de:ANY:NOLANG"
          }
        }
      },
      {
        ontological_settings_preamble: {
          group: "Ontological",
          text: "Set before data ingestion...",
          label: {
            title: "The following settings must be adjusted before\ndata ingestion for them to take effect."
          }
        }
      },
      {
        show_class_instance_edges: {
          group: "Ontological",
          text: "Show class-instance relationships",
          label: {
            title: "display the class-instance relationship as an edge"
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        //checked: "checked"
        make_nodes_for_literals: {
          group: "Ontological",
          text: "Make nodes for literals",
          label: {
            title: "show literal values (dates, strings, numbers) as nodes"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          },
          event_type: "change"
        }
      },
      {
        group_literals_by_subj_and_pred: {
          group: "Ontological",
          text: "Group literals by subject & predicate",
          label: {
            title: "Group literals together as a single node when they have\na language indicated and they share a subject and predicate, on the\ntheory that they are different language versions of the same text."
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      },
      {
        color_nodes_as_pies: {
          group: "Ontological",
          text: "Color nodes as pies",
          label: {
            title: "Show all a nodes types as colored pie pieces."
          },
          input: {
            type: "checkbox" //checked: "checked"
          }
        }
      },
      {
        prune_walk_nodes: {
          text: "Walk styles ",
          style: "display:none",
          label: {
            title: "As path is walked, keep or prune connected nodes on selected steps"
          },
          input: {
            type: "select"
          },
          options: [
            {
              label: "Directional (pruned)",
              value: "directional_path",
              selected: true
            },
            {
              label: "Non-directional (pruned)",
              value: "pruned_path"
            },
            {
              label: "Non-directional (unpruned)",
              value: "hairy_path"
            }
          ]
        }
      },
      {
        show_hide_endpoint_loading: {
          style: "display:none",
          class: "alpha_feature",
          text: "Show SPARQL endpoint loading forms",
          label: {
            title: "Show SPARQL endpoint interface for querying for nodes"
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        graph_title_style: {
          group: "Captions",
          text: "Title display ",
          label: {
            title: "Select graph title style"
          },
          input: {
            type: "select"
          },
          options: [
            {
              label: "Watermark",
              value: "subliminal"
            },
            {
              label: "Bold Titles 1",
              value: "bold1"
            },
            {
              label: "Bold Titles 2",
              value: "bold2"
            },
            {
              label: "Custom Captions",
              value: "custom"
            }
          ]
        }
      },
      {
        graph_custom_main_title: {
          group: "Captions",
          style: "display:none",
          text: "Custom Title",
          label: {
            title: "Title that appears on the graph background"
          },
          input: {
            type: "text",
            size: "16",
            placeholder: "Enter Title"
          }
        }
      },
      {
        graph_custom_sub_title: {
          group: "Captions",
          style: "display:none",
          text: "Custom Sub-title",
          label: {
            title: "Sub-title that appears below main title"
          },
          input: {
            type: "text",
            size: "16",
            placeholder: "Enter Sub-title"
          }
        }
      },
      {
        discover_geonames_as: {
          group: "Geonames",
          html_text: '<a href="http://www.geonames.org/login" target="geonamesAcct">Username</a> ',
          label: {
            title: "The GeoNames Username to look up geonames as"
          },
          input: {
            jsWidgetClass: GeoUserNameWidget,
            type: "text",
            value: "", // "smurp_nooron"
            size: "14",
            placeholder: "e.g. huviz"
          }
        }
      },
      {
        discover_geonames_remaining: {
          group: "Geonames",
          text: 'GeoNames Limit ',
          label: {
            title: "The number of Remaining Geonames to look up"
          },
          input: {
            type: "integer",
            value: 20,
            size: 6
          }
        }
      },
      {
        discover_geonames_greedily: {
          group: "Geonames",
          text: "Capture GeoNames Greedily",
          label: {
            title: "Capture not just names but populations too."
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        //checked: "checked"
        discover_geonames_deeply: {
          group: "Geonames",
          text: "Capture GeoNames Deeply",
          label: {
            title: "Capture not just directly referenced but also the containing geographical places from GeoNames."
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        //checked: "checked"
        show_edge_labels_adjacent_to_labelled_nodes: {
          group: "Labels",
          text: "Show adjacent edge labels",
          label: {
            title: "Show edge labels adjacent to labelled nodes"
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        //checked: "checked"
        show_edges: {
          class: "alpha_feature",
          text: "Show Edges",
          label: {
            title: "Do draw edges"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      },
      {
        single_chosen: {
          class: "alpha_feature",
          text: "Single Active Node",
          label: {
            title: "Only use verbs which have one chosen node at a time"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      },
      {
        arrows_chosen: {
          class: "alpha_feature",
          text: "Arrowheads on Edges",
          label: {
            title: "Displays directional arrowheads on the 'object' end of lines."
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        //checked: "checked"
        show_images_in_nodes: {
          group: "Images",
          class: "alpha_feature",
          text: "Show Images in Nodes",
          label: {
            title: "Show dbpedia:thumbnail and foaf:thumbnail in nodes when available"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      },
      {
        show_thumbs_dont_graph: {
          group: "Images",
          class: "alpha_feature",
          text: "Show thumbnails, don't graph",
          label: {
            title: "Treat dbpedia:thumbnail and foaf:thumbnail as images, not graph data"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      },
      {
        debug_shelf_angles_and_flipping: {
          group: "Debugging",
          class: "alpha_feature",
          text: "debug shelf angles and flipping",
          label: {
            title: "show angles and flags with labels"
          },
          input: {
            type: "checkbox" //checked: "checked"
          }
        }
      },
      {
        show_hide_performance_monitor: {
          group: "Debugging",
          class: "alpha_feature",
          text: "Show Performance Monitor",
          label: {
            title: "Feedback on what HuViz is doing"
          },
          input: {
            type: "checkbox"
          }
        }
      },
      {
        slow_it_down: {
          group: "Debugging",
          class: "alpha_feature",
          text: "Slow it down (sec)",
          label: {
            title: "execute commands with wait states to simulate long operations"
          },
          input: {
            value: 0,
            min: 0,
            max: 10,
            step: 0.1,
            type: "range"
          }
        }
      },
      {
        show_hunt_verb: {
          group: "Debugging",
          class: "alpha_feature",
          text: "Show Hunt verb",
          label: {
            title: "Expose the 'Hunt' verb, for demonstration of SortedSet.binary_search()"
          },
          input: {
            type: "checkbox"
          }
        }
      }
    ];

    // recognize that changing this will likely break old hybrid HuVizScripts
    Huviz.prototype.json_script_marker = "# JSON FOLLOWS";

    return Huviz;

  }).call(this);

  //console.log "Setting #{marker.label }to zero"
  OntologicallyGrounded = class OntologicallyGrounded extends Huviz {
    constructor() {
      super(...arguments);
      this.parseTTLOntology = this.parseTTLOntology.bind(this);
    }

    // If OntologicallyGrounded then there is an associated ontology which informs
    // the TaxonPicker and the PredicatePicker, rather than the pickers only
    // being informed by implicit ontological hints such as
    //   _:Fred a foaf:Person .  # tells us Fred is a Person
    //   _:Fred dc:name "Fred" . # tells us the predicate_picker needs "name"
    set_ontology(ontology_uri) {
      //@init_ontology()
      return this.read_ontology(ontology_uri);
    }

    read_ontology(url) {
      if (url.startsWith('file:///') || url.indexOf('/') === -1) { // ie local file stored in datasetDB
        this.get_resource_from_db(url, (err, rsrcRec) => {
          if (rsrcRec != null) {
            this.parseTTLOntology(rsrcRec.data);
            return;
          }
          this.blurt(err || `'${url}' was not found in your ONTOLOGY menu.  Provide it and reload page`);
          this.reset_dataset_ontology_loader();
        });
        return;
      }
      return $.ajax({
        url: url,
        async: false,
        success: this.parseTTLOntology,
        error: (jqxhr, textStatus, errorThrown) => {
          // REVIEW standardize on @blurt(), right?
          return this.show_state_msg(errorThrown + " while fetching ontology " + url);
        }
      });
    }

    parseTTLOntology(data, textStatus) {
      var frame, label, obj, obj_lid, obj_raw, ontology, pred, pred_id, pred_lid, ref, results1, subj_lid, subj_uri;
      boundMethodCheck(this, OntologicallyGrounded);
      // detect (? rdfs:subClassOf ?) and (? ? owl:Class)
      // Analyze the ontology to enable proper structuring of the
      // predicate_picker and the taxon_picker.  Also to support
      // imputing 'type' (and hence Taxon) to nodes.
      ontology = this.ontology;
      if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
        this.raw_ontology = new GreenerTurtle().parse(data, "text/turtle");
        ref = this.raw_ontology.subjects;
        results1 = [];
        for (subj_uri in ref) {
          frame = ref[subj_uri];
          subj_lid = uniquer(subj_uri);
          results1.push((function() {
            var ref1, results2;
            ref1 = frame.predicates;
            results2 = [];
            for (pred_id in ref1) {
              pred = ref1[pred_id];
              pred_lid = uniquer(pred_id);
              results2.push((function() {
                var j, len1, ref2, results3;
                ref2 = pred.objects;
                results3 = [];
                for (j = 0, len1 = ref2.length; j < len1; j++) {
                  obj = ref2[j];
                  obj_raw = obj.value;
                  if (pred_lid === 'comment') {
                    //console.error "  skipping",subj_lid, pred_lid #, pred
                    continue;
                  }
                  if (pred_lid === 'label') { // commented out by above test
                    label = obj_raw;
                    if (ontology.label[subj_lid] != null) {
                      ontology.label[subj_lid].set_val_lang(label, obj.language);
                    } else {
                      ontology.label[subj_lid] = new MultiString(label, obj.language);
                    }
                  }
                  obj_lid = uniquer(obj_raw);
                  //if pred_lid in ['range','domain']
                  //  console.log pred_lid, subj_lid, obj_lid
                  if (pred_lid === 'domain') {
                    results3.push(ontology.domain[subj_lid] = obj_lid);
                  } else if (pred_lid === 'range') {
                    if (ontology.range[subj_lid] == null) {
                      ontology.range[subj_lid] = [];
                    }
                    if (!(indexOf.call(ontology.range, obj_lid) >= 0)) {
                      results3.push(ontology.range[subj_lid].push(obj_lid));
                    } else {
                      results3.push(void 0);
                    }
                  } else if (pred_lid === 'subClassOf' || pred_lid === 'subClass') {
                    results3.push(ontology.subClassOf[subj_lid] = obj_lid);
                  } else if (pred_lid === 'subPropertyOf') {
                    results3.push(ontology.subPropertyOf[subj_lid] = obj_lid);
                  } else {
                    results3.push(void 0);
                  }
                }
                return results3;
              })());
            }
            return results2;
          })());
        }
        return results1;
      }
    }

  };

  Orlando = (function() {
    
    // [ rdf:type owl:AllDisjointClasses ;
    //   owl:members ( :Organization
    //                 :Person
    //                 :Place
    //                 :Sex
    //                 :Work
    //               )
    // ] .

    // If there exists (_:1, rdfs:type, owl:AllDisjointClasses)
    // Then create a root level class for every rdfs:first in rdfs:members
    class Orlando extends OntologicallyGrounded {
      // These are the Orlando specific methods layered on Huviz.
      // These ought to be made more data-driven.
      constructor() {
        var delay, onceDBReady, onceDBReadyCount;
        super(...arguments);
        if (window.indexedDB) {
          onceDBReadyCount = 0;
          delay = 100;
          onceDBReady = () => {
            onceDBReadyCount++;
            console.log('onceDBReady() call #' + onceDBReadyCount);
            if (this.datasetDB != null) {
              console.log('finally! datasetDB is now ready');
              return this.run_script_from_hash();
            } else {
              return setTimeout(onceDBReady, delay); // causes this method to be run again, acting as an async loop
            }
          };
          setTimeout(onceDBReady, delay);
        } else {
          // REVIEW not sure if this is worth doing (are we requiring indexedDB absolutely?)
          this.run_script_from_hash();
        }
      }

      get_default_set_by_type(node) {
        var ref;
        if (this.is_big_data()) {
          if ((ref = node.type) === 'writer') {
            return this.shelved_set;
          } else {
            return this.hidden_set;
          }
        }
        return this.shelved_set;
      }

      make_link(uri, text, target) {
        if (uri == null) {
          uri = "";
        }
        if (target == null) {
          target = synthIdFor(uri.replace(/\#.*$/, '')); // open only one copy of each document
        }
        if (text == null) {
          text = uri;
        }
        return `<a target="${target}" href="${uri}">${text}</a>`;
      }

      push_snippet(msg_or_obj) {
        var dataType, dataType_curie, dataType_uri, fontSize, m, obj, obj_dd;
        obj = msg_or_obj;
        fontSize = this.snippet_triple_em;
        if (this.snippet_box) {
          if (typeof msg_or_obj !== 'string') {
            [msg_or_obj, m] = [
              "",
              msg_or_obj // swap them
            ];
            if (obj.quad.obj_uri) {
              obj_dd = `${this.make_link(obj.quad.obj_uri)}`;
            } else {
              dataType_uri = m.edge.target.__dataType || "";
              dataType = "";
              if (dataType_uri) {
                dataType_curie = m.edge.target.type.replace('__', ':');
                //dataType = """^^<a target="_" href="#{dataType_uri}">#{dataType_curie}</a>"""
                dataType = `^^${this.make_link(dataType_uri, dataType_curie)}`;
              }
              obj_dd = `"${obj.quad.obj_val}"${dataType}`;
            }
            msg_or_obj = `<div id="${obj.snippet_js_key}">\n  <div style="font-size:${fontSize}em">\n    <h3>subject</h3>\n    <div class="snip_circle" style="background-color:${m.edge.source.color}; width: ${fontSize * 2.5}em; height: ${fontSize * 2.5}em;"></div>\n    <p style="margin-left: ${fontSize * 3.5}em">${this.make_link(obj.quad.subj_uri)}</p>\n\n    <h3>predicate </h3>\n    <div class="snip_arrow">\n      <div class="snip_arrow_stem" style="width: ${fontSize * 2}em; height: ${fontSize * 1}em; margin-top: ${fontSize * 0.75}em; background-color:${m.edge.color};"></div>\n      <div class="snip_arrow_head" style="border-color: transparent transparent transparent ${m.edge.color};border-width: ${fontSize * 1.3}em 0 ${fontSize * 1.3}em ${fontSize * 2.3}em;"></div>\n    </div>\n    <p class="pred" style="margin-left: ${fontSize * 4.8}em">${this.make_link(obj.quad.pred_uri)}</p>\n\n    <h3>object </h3>\n    <div class="snip_circle" style="background-color:${m.edge.target.color}; width: ${fontSize * 2.5}em; height: ${fontSize * 2.5}em;"></div>\n    <p style="margin-left: ${fontSize * 3.5}em">${obj_dd}</p>\n\n    <h3>source</h3>\n    <p style="margin-left: ${fontSize * 2.5}em">${this.make_link(obj.quad.graph_uri)}</p>\n  </div>\n</div>\n`;
          }
          //# unconfuse emacs Coffee-mode: " """ ' '  "
          return super.push_snippet(obj, msg_or_obj); // fail back to super
        }
      }

    };

    Orlando.prototype.HHH = {};

    Orlando.prototype.human_term = orlando_human_term;

    return Orlando;

  }).call(this);

  OntoViz = (function() {
    class OntoViz extends Huviz { //OntologicallyGrounded
      DEPRECATED_try_to_set_node_type(node, type) {
        // FIXME incorporate into ontoviz_type_to_hier_map

        if (type.match(/Property$/)) {
          node.type = 'properties';
        } else if (type.match(/Class$/)) {
          node.type = 'classes';
        } else {
          console.log(node.id + ".type is", type);
          return false;
        }
        console.log("try_to_set_node_type", node.id, "=====", node.type);
        return true;
      }

    };

    OntoViz.prototype.human_term = orlando_human_term;

    OntoViz.prototype.HHH = {
      ObjectProperty: 'Thing',
      Class: 'Thing',
      SymmetricProperty: 'ObjectProperty',
      IrreflexiveProperty: 'ObjectProperty',
      AsymmetricProperty: 'ObjectProperty'
    };

    OntoViz.prototype.ontoviz_type_to_hier_map = {
      RDF_type: "classes",
      OWL_ObjectProperty: "properties",
      OWL_Class: "classes"
    };

    OntoViz.prototype.use_lid_as_node_name = true;

    OntoViz.prototype.snippet_count_on_edge_labels = false;

    // first, rest and members are produced by GreenTurtle regarding the AllDisjointClasses list
    OntoViz.prototype.predicates_to_ignore = ["anything", "comment", "first", "rest", "members"];

    return OntoViz;

  }).call(this);

  Socrata = (function() {
    /*
     * Inspired by https://data.edmonton.ca/
     *             https://data.edmonton.ca/api/views{,.json,.rdf,...}
     *
     */
    var categories;

    class Socrata extends Huviz {
      constructor() {
        super(...arguments);
        this.parseAndShowJSON = this.parseAndShowJSON.bind(this);
      }

      ensure_category(category_name) {
        var cat_id;
        cat_id = category_name.replace(/\w/, '_');
        if (this.categories[category_id] != null) {
          this.categories[category_id] = category_name;
          this.assert_name(category_id, category_name);
          this.assert_instanceOf(category_id, DC_subject);
        }
        return cat_id;
      }

      assert_name(uri, name, g) {
        name = name.replace(/^\s+|\s+$/g, '');
        return this.add_quad({
          s: uri,
          p: RDFS_label,
          o: {
            type: RDF_literal,
            value: stripped_name
          }
        });
      }

      assert_instanceOf(inst, clss, g) {
        return this.add_quad({
          s: inst,
          p: RDF_a,
          o: {
            type: RDF_object,
            value: clss
          }
        });
      }

      assert_propertyValue(sub_uri, pred_uri, literal) {
        console.log("assert_propertyValue", arguments);
        return this.add_quad({
          s: subj_uri,
          p: pred_uri,
          o: {
            type: RDF_literal,
            value: literal
          }
        });
      }

      assert_relation(subj_uri, pred_uri, obj_uri) {
        console.log("assert_relation", arguments);
        return this.add_quad({
          s: subj_uri,
          p: pred_uri,
          o: {
            type: RDF_object,
            value: obj_uri
          }
        });
      }

      parseAndShowJSON(data) {
        var cat_id, dataset, g, j, k, len1, q, results1, v;
        boundMethodCheck(this, Socrata);
        //TODO Currently not working/tested
        console.log("parseAndShowJSON", data);
        g = this.DEFAULT_CONTEXT;
//  https://data.edmonton.ca/api/views/sthd-gad4/rows.json
        results1 = [];
        for (j = 0, len1 = data.length; j < len1; j++) {
          dataset = data[j];
          //dataset_uri = "https://data.edmonton.ca/api/views/#{dataset.id}/"
          console.log(this.dataset_uri);
          q = {
            g: g,
            s: dataset_uri,
            p: RDF_a,
            o: {
              type: RDF_literal,
              value: 'dataset'
            }
          };
          console.log(q);
          this.add_quad(q);
          results1.push((function() {
            var results2;
            results2 = [];
            for (k in dataset) {
              v = dataset[k];
              if (!is_on_of(k, [
                'category',
                'name',
                'id' // ,'displayType'
              ])) {
                continue;
              }
              q = {
                g: g,
                s: dataset_uri,
                p: k,
                o: {
                  type: RDF_literal,
                  value: v
                }
              };
              if (k === 'category') {
                cat_id = this.ensure_category(v);
                this.assert_instanceOf(dataset_uri, OWL_Class);
                continue;
              }
              if (k === 'name') {
                assert_propertyValue(dataset_uri, RDFS_label, v);
                continue;
              }
              continue;
              if (typeof v === 'object') {
                continue;
              }
              if (k === 'name') {
                console.log(dataset.id, v);
              }
              //console.log k,typeof v
              results2.push(this.add_quad(q));
            }
            return results2;
          }).call(this));
        }
        return results1;
      }

    };

    categories = {};

    return Socrata;

  }).call(this);

  PickOrProvide = (function() {
    //console.log q
    class PickOrProvide {
      constructor(huviz, append_to_sel, label1, css_class, isOntology, isEndpoint, opts) {
        var dndLoaderClass;
        this.add_uri = this.add_uri.bind(this);
        this.add_local_file = this.add_local_file.bind(this);
        this.add_resource_option = this.add_resource_option.bind(this);
        //console.info "form", @form
        this.onchange = this.onchange.bind(this);
        this.get_selected_option = this.get_selected_option.bind(this);
        this.delete_selected_option = this.delete_selected_option.bind(this);
        this.huviz = huviz;
        this.append_to_sel = append_to_sel;
        this.label = label1;
        this.css_class = css_class;
        this.isOntology = isOntology;
        this.isEndpoint = isEndpoint;
        this.opts = opts;
        if (this.opts == null) {
          this.opts = {};
        }
        this.uniq_id = this.huviz.unique_id();
        this.select_id = this.huviz.unique_id();
        this.pickable_uid = this.huviz.unique_id();
        this.your_own_uid = this.huviz.unique_id();
        this.find_or_append_form();
        dndLoaderClass = this.opts.dndLoaderClass || DragAndDropLoader;
        this.drag_and_drop_loader = new dndLoaderClass(this.huviz, this.append_to_sel, this);
        this.drag_and_drop_loader.form.hide();
        //@add_group({label: "-- Pick #{@label} --", id: @pickable_uid})
        this.add_group({
          label: "Your Own",
          id: this.your_own_uid
        }, 'append');
        this.add_option({
          label: `Provide New ${this.label} ...`,
          value: 'provide'
        }, this.select_id);
        this.add_option({
          label: "Pick or Provide...",
          canDelete: false
        }, this.select_id, 'prepend');
        this;
      }

      val(val) {
        console.log(this.constructor.name + '.val(' + (val && '"' + val + '"' || '') + ') for ' + this.opts.rsrcType + ' was ' + this.pick_or_provide_select.val());
        this.pick_or_provide_select.val(val);
        return this.refresh();
      }

      disable() {
        this.pick_or_provide_select.prop('disabled', true);
        return this.form.find('.delete_option').hide();
      }

      enable() {
        this.pick_or_provide_select.prop('disabled', false);
        return this.form.find('.delete_option').show();
      }

      select_option(option) {
        var cur_val, new_val;
        new_val = option.val();
        //console.table([{last_val: @last_val, new_val: new_val}])
        cur_val = this.pick_or_provide_select.val();
        // TODO remove last_val = null in @init_resource_menus() by fixing logic below
        //   What is happening is that the AJAX loading of preloads means that
        //   it is as if each of the new datasets is being selected as it is
        //   added -- but when the user picks an actual ontology then
        //   @set_ontology_from_dataset_if_possible() fails if the new_val == @last_val
        if (cur_val !== this.last_val) { // and not @isOntology
          this.last_val = cur_val;
        }
        if (this.last_val !== new_val) {
          this.last_val = new_val;
          if (new_val) {
            this.pick_or_provide_select.val(new_val);
            return this.value = new_val;
          } else {
            return console.warn("TODO should set option to nothing");
          }
        }
      }

      add_uri(uri_or_rec) {
        var rsrcRec, uri;
        if (typeof uri_or_rec === 'string') {
          uri = uri_or_rec;
          rsrcRec = {};
        } else {
          rsrcRec = uri_or_rec;
        }
        if (rsrcRec.uri == null) {
          rsrcRec.uri = uri;
        }
        if (rsrcRec.isOntology == null) {
          rsrcRec.isOntology = this.isOntology;
        }
        if (rsrcRec.isEndpoint == null) {
          rsrcRec.isEndpoint = this.isEndpoint;
        }
        if (rsrcRec.time == null) {
          rsrcRec.time = (new Date()).toISOString();
        }
        if (rsrcRec.isUri == null) {
          rsrcRec.isUri = true;
        }
        if (rsrcRec.title == null) {
          rsrcRec.title = rsrcRec.uri;
        }
        if (rsrcRec.canDelete == null) {
          rsrcRec.canDelete = !(rsrcRec.time == null);
        }
        if (rsrcRec.label == null) {
          rsrcRec.label = rsrcRec.uri.split('/').reverse()[0] || rsrcRec.uri;
        }
        if (rsrcRec.label === "sparql") {
          rsrcRec.label = rsrcRec.uri;
        }
        if (rsrcRec.rsrcType == null) {
          rsrcRec.rsrcType = this.opts.rsrcType;
        }
        // rsrcRec.data ?= file_rec.data # we cannot add data because for uri we load each time
        this.add_resource(rsrcRec, true);
        return this.update_state();
      }

      add_local_file(file_rec) {
        var rsrcRec, uri;
        // These are local files which have been 'uploaded' to the browser.
        // As a consequence they cannot be programmatically loaded by the browser
        // and so we cache them
        //local_file_data = file_rec.data
        //@huviz.local_file_data = local_file_data
        if (typeof file_rec === 'string') {
          uri = file_rec;
          rsrcRec = {};
        } else {
          rsrcRec = file_rec;
          if (rsrcRec.uri == null) {
            rsrcRec.uri = uri;
          }
          if (rsrcRec.isOntology == null) {
            rsrcRec.isOntology = this.isOntology;
          }
          if (rsrcRec.time == null) {
            rsrcRec.time = (new Date()).toISOString();
          }
          if (rsrcRec.isUri == null) {
            rsrcRec.isUri = false;
          }
          if (rsrcRec.title == null) {
            rsrcRec.title = rsrcRec.uri;
          }
          if (rsrcRec.canDelete == null) {
            rsrcRec.canDelete = !(rsrcRec.time == null);
          }
          if (rsrcRec.label == null) {
            rsrcRec.label = rsrcRec.uri.split('/').reverse()[0];
          }
          if (rsrcRec.rsrcType == null) {
            rsrcRec.rsrcType = this.opts.rsrcType;
          }
          if (rsrcRec.data == null) {
            rsrcRec.data = file_rec.data;
          }
        }
        this.add_resource(rsrcRec, true);
        return this.update_state();
      }

      add_resource(rsrcRec, store_in_db) {
        var uri;
        uri = rsrcRec.uri;
        //rsrcRec.uri ?= uri.split('/').reverse()[0]
        if (store_in_db) {
          return this.huviz.add_resource_to_db(rsrcRec, this.add_resource_option);
        } else {
          return this.add_resource_option(rsrcRec);
        }
      }

      add_resource_option(rsrcRec) { // TODO rename to rsrcRec
        var uri;
        uri = rsrcRec.uri;
        rsrcRec.value = rsrcRec.uri;
        this.add_option(rsrcRec, this.pickable_uid);
        this.pick_or_provide_select.val(uri);
        return this.refresh();
      }

      add_group(grp_rec, which) {
        var optgrp;
        if (which == null) {
          which = 'append';
        }
        optgrp = $(`<optgroup label="${grp_rec.label}" id="${grp_rec.id || this.huviz.unique_id()}"></optgroup>`);
        if (which === 'prepend') {
          this.pick_or_provide_select.prepend(optgrp);
        } else {
          this.pick_or_provide_select.append(optgrp);
        }
        return optgrp;
      }

      add_option(opt_rec, parent_uid, pre_or_append) {
        var j, k, len1, len2, o, opt, opt_group, opt_group_label, opt_str, ref, ref1, val;
        if (pre_or_append == null) {
          pre_or_append = 'append';
        }
        if (opt_rec.label == null) {
          console.log("missing .label on", opt_rec);
        }
        if (this.pick_or_provide_select.find(`option[value='${opt_rec.value}']`).length) {
          return;
        }
        //alert "add_option() #{opt_rec.value} collided"
        opt_str = `<option id="${this.huviz.unique_id()}"></option>`;
        opt = $(opt_str);
        opt_group_label = opt_rec.opt_group;
        if (opt_group_label) {
          opt_group = this.pick_or_provide_select.find(`optgroup[label='${opt_group_label}']`);
          //console.log(opt_group_label, opt_group.length) #, opt_group[0])
          if (!opt_group.length) {
            //@huviz.blurt("adding '#{opt_group_label}'")
            opt_group = this.add_group({
              label: opt_group_label
            }, 'prepend');
          }
          // opt_group = $('<optgroup></optgroup>')
          // opt_group.attr('label', opt_group_label)
          // @pick_or_provide_select.append(opt_group)
          //if not opt_group.length
          //  @huviz.blurt('  but it does not yet exist')
          opt_group.append(opt); // There is no opt_group_label, so this is a top level entry, ie a group, etc
        } else {
          if (pre_or_append === 'append') {
            $(`#${parent_uid}`).append(opt);
          } else {
            $(`#${parent_uid}`).prepend(opt);
          }
        }
        ref = ['value', 'title', 'class', 'id', 'style', 'label'];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          k = ref[j];
          if (opt_rec[k] != null) {
            $(opt).attr(k, opt_rec[k]);
          }
        }
        ref1 = ['isUri', 'canDelete', 'ontologyUri', 'ontology_label'];
        // TODO standardize on _
        for (o = 0, len2 = ref1.length; o < len2; o++) {
          k = ref1[o];
          if (opt_rec[k] != null) {
            val = opt_rec[k];
            $(opt).data(k, val);
          }
        }
        return opt[0];
      }

      update_state(callback) {
        var canDelete, disable_the_delete_button, kid_cnt, label_value, raw_value, selected_option, the_options;
        raw_value = this.pick_or_provide_select.val();
        selected_option = this.get_selected_option();
        label_value = selected_option[0].label;
        the_options = this.pick_or_provide_select.find("option");
        kid_cnt = the_options.length;
        //console.log("#{@label}.update_state() raw_value: #{raw_value} kid_cnt: #{kid_cnt}")
        if (raw_value === 'provide') {
          this.drag_and_drop_loader.form.show();
          this.state = 'awaiting_dnd';
          this.value = void 0;
        } else {
          this.drag_and_drop_loader.form.hide();
          this.state = 'has_value';
          this.value = raw_value;
          this.label = label_value;
        }
        disable_the_delete_button = true;
        if (this.value != null) {
          canDelete = selected_option.data('canDelete');
          disable_the_delete_button = !canDelete;
        }
        // disable_the_delete_button = false  # uncomment to always show the delete button -- useful when bad data stored
        this.form.find('.delete_option').prop('disabled', disable_the_delete_button);
        if (callback != null) {
          return callback();
        }
      }

      find_or_append_form() {
        if (!$(this.local_file_form_sel).length) {
          $(this.append_to_sel).append(this.tmpl.replace('REPLACE_WITH_LABEL', this.label).replace('UID', this.uniq_id));
        }
        this.form = $(`#${this.uniq_id}`);
        this.pick_or_provide_select = this.form.find("select[name='pick_or_provide']");
        this.pick_or_provide_select.attr('id', this.select_id);
        //console.debug @css_class,@pick_or_provide_select
        this.pick_or_provide_select.change(this.onchange);
        this.delete_option_button = this.form.find('.delete_option');
        this.delete_option_button.click(this.delete_selected_option);
        return this.form.find('.delete_option').prop('disabled', true); // disabled initially
      }

      onchange(e) {
        //e.stopPropagation()
        return this.refresh();
      }

      get_selected_option() {
        return this.pick_or_provide_select.find('option:selected'); // just one CAN be selected
      }

      delete_selected_option(e) {
        var selected_option, val;
        e.stopPropagation();
        selected_option = this.get_selected_option();
        val = selected_option.attr('value');
        if (val != null) {
          this.huviz.remove_dataset_from_db(this.value);
          this.delete_option(selected_option);
          return this.update_state();
        }
      }

      //  @value = null
      delete_option(opt_elem) {
        var uri;
        uri = opt_elem.attr('value');
        this.huviz.remove_dataset_from_db(uri);
        opt_elem.remove();
        return this.huviz.update_dataset_ontology_loader();
      }

      refresh() {
        return this.update_state(this.huviz.update_dataset_ontology_loader);
      }

    };

    PickOrProvide.prototype.tmpl = "<form id=\"UID\" class=\"pick_or_provide_form\" method=\"post\" action=\"\" enctype=\"multipart/form-data\">\n    <span class=\"pick_or_provide_label\">REPLACE_WITH_LABEL</span>\n    <select name=\"pick_or_provide\"></select>\n    <button type=\"button\" class=\"delete_option\"><i class=\"fa fa-trash\" style=\"font-size: 1.2em;\"></i></button>\n  </form>";

    PickOrProvide.prototype.uri_file_loader_sel = '.uri_file_loader_form';

    return PickOrProvide;

  }).call(this);

  PickOrProvideScript = class PickOrProvideScript extends PickOrProvide {
    constructor() {
      super(...arguments);
      this.onchange = this.onchange.bind(this);
    }

    onchange(e) {
      boundMethodCheck(this, PickOrProvideScript);
      super.onchange(e);
      return this.huviz.visualize_dataset_using_ontology();
    }

  };

  DragAndDropLoader = (function() {
    // inspiration: https://css-tricks.com/drag-and-drop-file-uploading/
    class DragAndDropLoader {
      constructor(huviz, append_to_sel, picker) {
        this.huviz = huviz;
        this.append_to_sel = append_to_sel;
        this.picker = picker;
        this.local_file_form_id = this.huviz.unique_id();
        this.local_file_form_sel = `#${this.local_file_form_id}`;
        this.find_or_append_form();
        if (this.supports_file_dnd()) {
          this.form.show();
          this.form.addClass('supports-dnd');
          this.form.find(".box__dragndrop").show();
        }
      }

      supports_file_dnd() {
        var div;
        div = document.createElement('div');
        return true;
        return (div.draggable || div.ondragstart) && div.ondrop && (window.FormData && window.FileReader);
      }

      load_uri(firstUri) {
        //@form.find('.box__success').text(firstUri)
        //@form.find('.box__success').show()
        //TODO SHOULD selection be added to the picker here, or wait for after successful?
        this.picker.add_uri({
          uri: firstUri,
          opt_group: 'Your Own'
        });
        this.form.hide();
        return true; // ie success
      }

      load_file(firstFile) {
        var filename, reader;
        this.huviz.local_file_data = "empty";
        filename = firstFile.name;
        this.form.find('.box__success').text(firstFile.name); //TODO Are these lines still needed?
        this.form.find('.box__success').show();
        reader = new FileReader();
        reader.onload = (evt) => {
          var e, msg;
          try {
            //@huviz.read_data_and_show(firstFile.name, evt.target.result)
            //console.log evt.target.result
            //console.log("evt", evt)
            if (filename.match(/.(ttl|.nq)$/)) {
              return this.picker.add_local_file({
                uri: firstFile.name,
                opt_group: 'Your Own',
                data: evt.target.result
              });
            } else {
              //$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").prop('selected', true)
              //@huviz.local_file_data = evt.target.result  # REVIEW remove all uses of local_file_data?!?
              this.huviz.blurt(`Unknown file format. Unable to parse '${filename}'. ` + "Only .ttl and .nq files supported.", 'alert');
              this.huviz.reset_dataset_ontology_loader();
              return $('.delete_option').attr('style', '');
            }
          } catch (error1) {
            e = error1;
            msg = e.toString();
            //@form.find('.box__error').show()
            //@form.find('.box__error').text(msg)
            return this.huviz.blurt(msg, 'error');
          }
        };
        reader.readAsText(firstFile);
        return true; // ie success
      }

      find_or_append_form() {
        var elem, num_dnd_form;
        num_dnd_form = $(this.local_file_form_sel).length;
        if (!num_dnd_form) {
          elem = $(this.tmpl);
          $(this.append_to_sel).append(elem);
          elem.attr('id', this.local_file_form_id);
        }
        this.form = $(this.local_file_form_sel);
        this.form.on('submit unfocus', (evt) => {
          var uri, uri_field;
          uri_field = this.form.find('.box__uri');
          uri = uri_field.val();
          if (uri_field[0].checkValidity()) {
            uri_field.val('');
            this.load_uri(uri);
          }
          return false;
        });
        this.form.on('drag dragstart dragend dragover dragenter dragleave drop', (evt) => {
          //console.clear()
          evt.preventDefault();
          return evt.stopPropagation();
        });
        this.form.on('dragover dragenter', () => {
          this.form.addClass('is-dragover');
          return console.log("addClass('is-dragover')");
        });
        this.form.on('dragleave dragend drop', () => {
          return this.form.removeClass('is-dragover');
        });
        return this.form.on('drop', (e) => {
          var droppedFiles, droppedUris, firstFile, firstUri;
          console.log(e);
          console.log("e:", e.originalEvent.dataTransfer);
          this.form.find('.box__input').hide();
          droppedUris = e.originalEvent.dataTransfer.getData("text/uri-list").split("\n");
          console.log("droppedUris", droppedUris);
          firstUri = droppedUris[0];
          if (firstUri.length) {
            if (this.load_uri(firstUri)) {
              this.form.find(".box__success").text('');
              this.picker.refresh();
              this.form.hide();
              return;
            }
          }
          droppedFiles = e.originalEvent.dataTransfer.files;
          console.log("droppedFiles", droppedFiles);
          if (droppedFiles.length) {
            firstFile = droppedFiles[0];
            if (this.load_file(firstFile)) {
              this.form.find(".box__success").text('');
              this.picker.refresh();
              this.form.hide();
              return;
            }
          }
          // the drop operation failed to result in loaded data, so show 'drop here' msg
          this.form.find('.box__input').show();
          return this.picker.refresh();
        });
      }

    };

    DragAndDropLoader.prototype.tmpl = "<form class=\"local_file_form\" method=\"post\" action=\"\" enctype=\"multipart/form-data\">\n  <div class=\"box__input\">\n    <input class=\"box__file\" type=\"file\" name=\"files[]\" id=\"file\"\n             data-multiple-caption=\"{count} files selected\" multiple />\n    <label for=\"file\"><span class=\"box__label\">Choose a local file</span></label>\n    <button class=\"box__upload_button\" type=\"submit\">Upload</button>\n      <div class=\"box__dragndrop\" style=\"display:none\"> Drop URL or file here</div>\n  </div>\n    <input type=\"url\" class=\"box__uri\" placeholder=\"Or enter URL here\" />\n  <div class=\"box__uploading\" style=\"display:none\">Uploading&hellip;</div>\n  <div class=\"box__success\" style=\"display:none\">Done!</div>\n  <div class=\"box__error\" style=\"display:none\">Error! <span></span>.</div>\n  </form>";

    return DragAndDropLoader;

  }).call(this);

  DragAndDropLoaderOfScripts = class DragAndDropLoaderOfScripts extends DragAndDropLoader {
    load_file(firstFile) {
      var filename, reader;
      filename = firstFile.name;
      this.form.find('.box__success').text(firstFile.name); //TODO Are these lines still needed?
      this.form.find('.box__success').show();
      reader = new FileReader();
      reader.onload = (evt) => {
        var err, file_rec, msg;
        try {
          //@huviz.read_data_and_show(firstFile.name, evt.target.result)
          if (filename.match(/.(txt|.json)$/)) {
            file_rec = {
              uri: firstFile.name,
              opt_group: 'Your Own',
              data: evt.target.result
            };
            return this.picker.add_local_file(file_rec);
          } else {
            //$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").prop('selected', true)
            //@huviz.local_file_data = evt.target.result
            this.huviz.blurt(`Unknown file format. Unable to parse '${filename}'. ` + "Only .txt and .huviz files supported.", 'alert');
            this.huviz.reset_dataset_ontology_loader();
            return $('.delete_option').attr('style', '');
          }
        } catch (error1) {
          err = error1;
          msg = err.toString();
          //@form.find('.box__error').show()
          //@form.find('.box__error').text(msg)
          return this.huviz.blurt(msg, 'error');
        }
      };
      reader.readAsText(firstFile);
      return true; // ie success
    }

  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).Huviz = Huviz;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Orlando = Orlando;

  (typeof exports !== "undefined" && exports !== null ? exports : this).OntoViz = OntoViz;

  //(exports ? this).Socrata = Socrata
  (typeof exports !== "undefined" && exports !== null ? exports : this).Edge = Edge;

}).call(this);

(function() {
  
  var IndexedDBService,
    indexOf = [].indexOf;

  IndexedDBService = (function() {
    class IndexedDBService {
      constructor(huviz) {
        this.huviz = huviz;
        this.dbName = this.get_dbName();
        this.dbStoreName = "ntuples";
        this.initialize_db();
      }

      expunge_db(dbname, callback) {
        var del_req;
        //alert("deleting #{dbname or @dbName}")
        del_req = window.indexedDB.deleteDatabase('doof' || dbname || this.dbName);
        del_req.onerror = (e) => {
          //alert(e.toString())
          if (callback != null) {
            return callback(e);
          }
        };
        return del_req.onsuccess = (e) => {
          //alert("done deleting #{dbname}")
          if (dbname === this.dbName) {
            this.nstoreDB = void 0;
          }
          if (callback != null) {
            return callback();
          }
        };
      }

      initialize_db(callback) {
        var indexedDB, msg, req, when_done;
        indexedDB = window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        if (!indexedDB) {
          throw new Error("indexedDB not available");
        }
        when_done = (db, why, cb, err) => {
          this.nstoreDB = db;
          if (cb != null) {
            return cb(err);
          }
        };
        if (this.nstoreDB != null) {
          msg = `nstoreDB already exists with name ${this.dbName}`;
          when_done(this.nstoreDB, msg, callback);
        } else {
          req = indexedDB.open(this.dbName, this.dbVer); //TODO the name of the dataindex needs to be tied to specific instances
          console.log(req); // 'req' is not in the same state as the samle ('pending') and does not have the proper definitions for onerror, onsuccess...etc.
          req.onsuccess = (evt) => {
            console.log(`onsuccess ${this.dbName}`);
            return when_done(req.result, "success", callback);
          };
          req.onerror = (evt) => {
            console.error("IndexDB Error: " + evt.target.error.message);
            if (callback != null) {
              return callback(evt.target.error);
            }
          };
          req.onupgradeneeded = (evt) => {
            var db, store;
            db = evt.target.result;
            console.log(`onupgradeneeded ${db.name}`);
            console.log(evt);
            if (evt.oldVersion === 1) {
              if (indexOf.call(db.objectStoreNames, 'spogis') >= 0) {
                alert("deleteObjectStore('spogis')");
                db.deleteObjectStore('spogis');
              }
            }
            if (evt.oldVersion < 3) { //Only create a new ObjectStore when initializing for the first time
              //alert("createObjectStore('#{@dbStoreName}')")
              store = db.createObjectStore(this.dbStoreName, {
                keyPath: 'id',
                autoIncrement: true
              });
              console.log(db);
              store.createIndex("s", "s", {
                unique: false
              });
              store.createIndex("p", "p", {
                unique: false
              });
              store.createIndex("o", "o", {
                unique: false
              });
              return store.transaction.oncomplete = (evt) => {
                when_done(db, "onupgradeneeded", callback);
                return console.log("transactions are complete");
              };
            }
          };
        }
      }

      get_dbName() {
        return this.huviz.args.editui__dbName || this.dbName_default;
      }

      add_node_to_db(quad) {
        console.log("add new node to DB");
        console.log(quad);
        return console.log(this.nstoreDB);
      }

    };

    IndexedDBService.prototype.dbName_default = 'nstoreDB';

    IndexedDBService.prototype.dbVer = 2;

    return IndexedDBService;

  }).call(this);

  //trx = @nstoreDB.transaction('spogis', "readwrite")
  //trx.oncomplete = (e) =>
  //  console.log "spogis added!"
  //trx.onerror = (e) =>
  //  console.log(e)
  //  alert "add_dataset(spogis) error!!!"
  (typeof exports !== "undefined" && exports !== null ? exports : this).IndexedDBService = IndexedDBService;

}).call(this);

(function() {
  var IndexedDBStorageController, indexdDBstore;

  indexdDBstore = require('indexeddbservice');

  IndexedDBStorageController = class IndexedDBStorageController {
    constructor(huviz, dbs) {
      this.huviz = huviz;
      this.dbs = dbs;
    }

    // preserves the graph_uri for inclusion in the quads when they are saved
    register(huviz) {
      this.huviz = huviz;
    }

    // called by the HuViz constructor if the `edit_handler` no, no *`storage_controller`*
    assert(quad) {
      var req, store, trx;
      //if not quad.g?
      //  quad.g = @graph_uri
      console.log("trx begin");
      trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readwrite');
      trx.oncomplete = (e) => {
        return console.log("trx complete!");
      };
      trx.onerror = (e) => {
        throw e;
      };
      store = trx.objectStore(this.dbs.dbStoreName);
      req = store.put(quad);
      return req.onsuccess = (e) => {
        console.log(quad, `added to ObjectStore: ${this.dbs.dbStoreName}`);
        return this.huviz.add_quad(quad);
      };
    }

    // gets called by the editui whenever Save is clicked
    // calls @huviz.add_quad (so huviz can display it)
    // saves the quad via IndexedDB to an objectStore called `quadstore`
    get_graphs() {}

    // returns the list of graphs from `quadstore` so PickOrProvide can show them for picking
    count(cb) {
      var objstor, req, trx;
      trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readonly');
      objstor = trx.objectStore(this.dbs.dbStoreName);
      req = objstor.count();
      return req.onsuccess = function() {
        return cb(req.result);
      };
    }

  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).IndexedDBStorageController = IndexedDBStorageController;

}).call(this);

(function() {
    // Purpose:
  //   convert 'mintree' structures like:
  //      {"BIO":["Biography",{"BIR":["Birth"]}],
  //       "WRK":["Work"]}
  //     where each node is an object with an id and name, and optional children
  //        {'ID' :['Name'],
  //         'GOD':['Yahwe',{'KID1':['Adam'],
  //                         'KID2':['Eve']}]}
  //   to structures like:
  //      {"name": "Name",
  //       "id":   "ID",

  var mintree2d3tree, test;

  mintree2d3tree = function(mintree, out, default_root, use_ids_as_names) {
    var k, node, v;
    use_ids_as_names = use_ids_as_names || false;
    default_root = default_root || {
      name: 'All',
      children: []
    };
    out = out || default_root;
//console.log("===============\nadding:\n",mintree,"\nto:\n",out)
    for (k in mintree) {
      v = mintree[k];
      if (use_ids_as_names) {
        node = {
          name: k
        };
      } else {
        node = {
          id: k
        };
      }
      if (v) {
        if (!use_ids_as_names) {
          node.name = v[0];
        }
        if (v[1]) {
          node.children = [];
          mintree2d3tree(v[1], node);
        }
      }
      out.children.push(node);
    }
    return out;
  };

  test = function() {
    var expect, genesis, got, got_str;
    genesis = {
      ID: ['Name'],
      GOD: [
        'Yahwe',
        {
          KID1: ['Adam'],
          KID2: ['Eve']
        }
      ]
    };
    expect = '{"name":"All","children":[{"id":"GOD","name":"Yahwe","children":[{"id":"KID1","name":"Adam"},{"id":"KID2","name":"Eve"}]}]}';
    got = mintree2d3tree(genesis);
    got_str = JSON.stringify(got);
    if (got_str === expect) {
      return console.log('success');
    } else {
      console.log("=========================================");
      return console.log("", got_str, "\n<>\n", expect);
    }
  };

  //window = window or exports
  window.mintree2d3tree = mintree2d3tree;

  // test()

}).call(this);

(function() {
  var Node, uniquer;

  uniquer = require("uniquer").uniquer;

  Node = (function() {
    class Node {
      constructor(id, use_lid_as_node_name) {
        this.id = id;
        this.bub_txt = [];
        this.links_from = [];
        this.links_to = [];
        this.links_shown = [];
        this.lid = uniquer(this.id);
        if (use_lid_as_node_name) {
          this.name = this.lid; // provide default name
        }
      }

      set_name(name) {
        this.name = name;
      }

      set_subject(s) {
        this.s = s;
      }

      point(point) {
        if (point != null) {
          this.x = point[0];
          this.y = point[1];
        }
        return [this.x, this.y];
      }

      prev_point(point) {
        if (point != null) {
          this.px = point[0];
          this.py = point[1];
        }
        return [this.px, this.py];
      }

      select() {
        var edge, i, j, len, len1, ref, ref1;
        ref = this.links_from;
        for (i = 0, len = ref.length; i < len; i++) {
          edge = ref[i];
          edge.select();
        }
        ref1 = this.links_to;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          edge = ref1[j];
          edge.select();
        }
        return this.taxon.update_state(this, 'select');
      }

      unselect() {
        var edge, i, j, len, len1, ref, ref1;
        ref = this.links_from;
        for (i = 0, len = ref.length; i < len; i++) {
          edge = ref[i];
          edge.unselect();
        }
        ref1 = this.links_to;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          edge = ref1[j];
          edge.unselect();
        }
        return this.taxon.update_state(this, 'unselect');
      }

      discard() {
        // should we unselect first if node.state is selected?
        return this.taxon.update_state(this, 'discard');
      }

    };

    Node.prototype.linked = false; // TODO(smurp) probably vestigal

    Node.prototype.showing_links = "none";

    Node.prototype.name = null;

    Node.prototype.s = null; // TODO(smurp) rename Node.s to Node.subject, should be optional

    Node.prototype.type = null;

    return Node;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Node = Node;

}).call(this);

(function() {
  var Predicate, TreeCtrl, uniquer;

  TreeCtrl = require('treectrl').TreeCtrl;

  uniquer = require("uniquer").uniquer;

  Predicate = (function() {
    class Predicate extends TreeCtrl {
      constructor(id) {
        super(...arguments);
        this.id = id;
        this.lid = uniquer(this.id); // lid means local_id
        this.all_edges = SortedSet().sort_on("id").named("predicate");
        // TODO check for .acquire() bugs re isState('_s') vs isState('_p')
        // An Edge is either selected or unselected, so they are mutually exclusive.
        // Hence .isState("_p") is common and unique to them.
        this.selected_instances = SortedSet().sort_on("id").named("selected").isState('_p');
        this.unselected_instances = SortedSet().sort_on("id").named("unselected").isState('_p');
        // An Edge is either shown or unshown, they are mutually exclusive.
        // Hence .isState("_s") is common and unique to them.
        // shown edges are those which are shown and linked to a selected source or target
        this.shown_instances = SortedSet().sort_on("id").named("shown").isState("_s");
        // unshown edges are those which are unshown and linked to a selected source or target
        this.unshown_instances = SortedSet().sort_on("id").named("unshown").isState("_s");
        this.change_map = {
          unselect: this.unselected_instances,
          select: this.selected_instances,
          unshow: this.unshown_instances,
          show: this.shown_instances
        };
        this;
      }

      add_inst(inst) {
        this.all_edges.add(inst);
        return this.update_state();
      }

      update_selected_instances() {
        var before_count, e, i, len, ref, results;
        before_count = this.selected_instances.length;
        ref = this.all_edges;
        // FIXME why can @selected_instances not be trusted?
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          e = ref[i];
          if (e.an_end_is_selected()) {
            results.push(this.selected_instances.acquire(e));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }

      update_state(inst, change) {
        this.update_selected_instances();
        return super.update_state(inst, change);
      }

      recalc_direct_stats() {
        return [this.count_shown_selected(), this.selected_instances.length];
      }

      count_shown_selected() {
        var count, e, i, len, ref;
        count = 0;
        ref = this.selected_instances;
        for (i = 0, len = ref.length; i < len; i++) {
          e = ref[i];
          if (e.shown != null) {
            count++;
          }
        }
        return count;
      }

    };

    Predicate.prototype.custom_event_name = 'changePredicate';

    return Predicate;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Predicate = Predicate;

}).call(this);

(function() {
  var Quad, QuadParser, RdfObject, RdfUri, isComment, parseQuadLine, quadRegex, uriRegex;

  QuadParser = class QuadParser {
    constructor(str_or_stream) {
      events.EventEmitter.call(this);
      
      //addEventListener
      if (typeof str_or_stream !== 'string') {
        throw new Error("QuadParser(stream) not yet supported");
      }
      this._lzy = {
        lines: str_or_stream.split("\n")
      };
      this;
    }

  };

  //console.log(line);
  Quad = function(subject, pred, obj, graph) {
    this.s = new RdfUri(subject);
    this.p = new RdfUri(pred);
    this.o = new RdfObject(obj);
    return this.g = new RdfUri(graph);
  };

  RdfUri = function(url) {
    var match, self;
    self = this;
    match = url.match(uriRegex);
    if (match) {
      return self.raw = match[1];
    } else {
      return self.raw = url;
    }
  };

  RdfObject = function(val) {
    var match, self;
    self = this;
    match = val.match(uriRegex);
    if (match) {
      self.raw = match[1];
      return self.type = "uri";
    } else {
      self.raw = val;
      return self.type = "literal";
    }
  };

  parseQuadLine = function(line) {
    var g, match, o, p, s;
    if ((line == null) || line === "" || line.match(isComment)) {
      return null;
    } else {
      //console.log ("parseQuadLine(",line,")");
      match = line.match(quadRegex);
      //console.log("match",match);
      if (match) {
        s = match[1].trim();
        p = match[2].trim();
        o = match[3].trim();
        g = match[4].trim();
        return new Quad(s, p, o, g);
      } else {
        return console.log("no match: " + line);
      }
    }
  };

  QuadParser.super_ = events.EventEmitter;

  QuadParser.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
      value: QuadParser,
      enumerable: false
    }
  });

  QuadParser.prototype.parse = function() {
    console.log("this", this);
    this._lzy.lines.forEach(function(line) {
      var quad, str;
      if ((line != null) && line !== undefined) {
        str = line.toString() + "\n";
        quad = parseQuadLine(str);
        console.log("quad good", quad);
        if (quad != null) {
          return this.emit("quad", quad);
        }
      }
    });
    return this.emit("end");
  };

  Quad.prototype.toString = function() {
    return "<" + this.s + "> <" + this.p + "> " + this.o + " <" + this.g + "> .\n";
  };

  Quad.prototype.toNQuadString = function() {
    return "<" + this.s + "> <" + this.p + "> " + this.o + " <" + this.g + "> .\n";
  };

  uriRegex = /<([^>]*)>/;

  RdfUri.prototype.toString = function() {
    return this.raw;
  };

  RdfObject.prototype.toString = function() {
    return this.raw;
  };

  RdfObject.prototype.isUri = function() {
    return this.type === "uri";
  };

  RdfObject.prototype.isLiteral = function() {
    return this.type === "literal";
  };

  quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*$/;

  isComment = /^\s*\/\//;

  // (exports ? this).QuadParser = QuadParser

// This coffeescript version has been replaced by the javascript version in js/quadParser.js


}).call(this);

(function() {
  var Taxon, TreeCtrl, angliciser;

  angliciser = require('angliciser').angliciser;

  TreeCtrl = require('treectrl').TreeCtrl;

  Taxon = (function() {
    class Taxon extends TreeCtrl {
      constructor(id) {
        super();
        this.id = id;
        this.lid = this.id; // FIXME @lid should be local @id should be uri, no?
        // FIXME try again to conver Taxon into a subclass of SortedSet
        //   Motivations
        //     1) remove redundancy of .register() and .add()
        //   Problems encountered:
        //     1) SortedSet is itself not really a proper subclass of Array.
        //        Isn't each instance directly adorned with methods like isState?
        //     2) Remember that d3 might need real Array instances for nodes, etc
        this.instances = SortedSet().named(this.id).isState('_isa').sort_on("id"); // FIXME state?
        // _tp is for 'taxon-pickedness' and has value selected, unselected or discarded
        //   (should probably be _ts for 'taxon-state'
        this.discarded_instances = SortedSet().named('discarded').isState('_tp').sort_on("id");
        this.selected_instances = SortedSet().named('selected').isState('_tp').sort_on("id");
        this.unselected_instances = SortedSet().named('unselected').isState('_tp').sort_on("id");
        this.change_map = {
          discard: this.discarded_instances,
          select: this.selected_instances,
          unselect: this.unselected_instances
        };
      }

      get_instances(hier) {
        var i, inst, j, len, len1, ref, ref1, results, retval, sub;
        if (hier) {
          retval = [];
          ref = this.get_instances(false);
          for (i = 0, len = ref.length; i < len; i++) {
            inst = ref[i];
            retval.push(inst);
          }
          ref1 = this.subs;
          results = [];
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            sub = ref1[j];
            results.push((function() {
              var k, len2, ref2, results1;
              ref2 = sub.get_instances(true);
              results1 = [];
              for (k = 0, len2 = ref2.length; k < len2; k++) {
                inst = ref2[k];
                results1.push(retval.push(inst));
              }
              return results1;
            })());
          }
          return results;
        } else {
          return this.instances;
        }
      }

      register(node) {
        // Slightly redundant given that @add makes a bidirectional link too
        // but the .taxon on node gives it access to the methods on the taxon.
        // Perhaps taxon should be a super of SortedSet rather than a facade.
        // Should Taxon delegate to SortedSet?
        node.taxon = this;
        return this.acquire(node);
      }

      acquire(node) {
        return this.instances.acquire(node);
      }

      recalc_direct_stats() {
        return [this.selected_instances.length, this.instances.length];
      }

      recalc_english(in_and_out) {
        var i, j, k, len, len1, len2, n, phrase, ref, ref1, ref2, sub;
        if (this.indirect_state === 'showing') {
          phrase = this.lid;
          if (this.subs.length > 0) {
            phrase = "every " + phrase;
          }
          in_and_out.include.push(phrase);
        } else {
          if (this.indirect_state === 'mixed') {
            if (this.state === 'showing') {
              in_and_out.include.push(this.lid);
            }
            if (this.state === 'mixed') {
              if (this.selected_instances.length < this.unselected_instances.length) {
                ref = this.selected_instances;
                for (i = 0, len = ref.length; i < len; i++) {
                  n = ref[i];
                  in_and_out.include.push(n.lid);
                }
              } else {
                in_and_out.include.push(this.id);
                ref1 = this.unselected_instances;
                for (j = 0, len1 = ref1.length; j < len1; j++) {
                  n = ref1[j];
                  in_and_out.exclude.push(n.lid);
                }
              }
            }
            ref2 = this.subs;
            for (k = 0, len2 = ref2.length; k < len2; k++) {
              sub = ref2[k];
              sub.recalc_english(in_and_out);
            }
          }
        }
      }

      update_english() {
        var evt, in_and_out;
        if (this.id !== "Thing") {
          console.error(`update_english(${this.lid}) should only be called on Thing`);
        }
        in_and_out = {
          include: [],
          exclude: []
        };
        this.recalc_english(in_and_out);
        evt = new CustomEvent('changeEnglish', {
          detail: {
            english: this.english_from(in_and_out)
          },
          bubbles: true,
          cancelable: true
        });
        return window.dispatchEvent(evt);
      }

      english_from(in_and_out) {
        var english;
        english = angliciser(in_and_out.include);
        if (in_and_out.exclude.length) {
          english += " except " + angliciser(in_and_out.exclude, " or ");
        }
        return english;
      }

    };

    // as Predicate is to Edge, Taxon is to Node, ie: type or class or whatever
    // Taxon actually contains Nodes directly, unlike TaxonAbstract (what a doof!)
    Taxon.prototype.suspend_updates = false;

    Taxon.prototype.custom_event_name = 'changeTaxon';

    return Taxon;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Taxon = Taxon;

}).call(this);

(function() {
  // Usage:
  //   txtcrsr = new TextCursor(".graph_control input", "click input for fun")
  var TextCursor;

  TextCursor = (function() {
    class TextCursor {
      constructor(elem, text) {
        this.elem = elem;
        this.cache = {};
        this.set_text(text);
        this.paused = false;
        this.last_text = "";
      }

      font_height() {
        return this.height * this.scale;
      }

      set_text(text, temp, bgcolor) {
        var cursor, url;
        //console.log("set_text(#{text.replace("\n", "\\n")})")
        this.bgFillStyle = bgcolor ? bgcolor : "yellow";
        if (text) {
          if (this.cache[text] == null) {
            this.cache[text] = this.make_img(text);
          }
          url = this.cache[text];
          //cursor = "url(#{url}) 0 #{@font_height()}, default"
          cursor = `url(${url}) ${this.pointer_height} 0, default`;
        } else {
          cursor = "default";
        }
        if (temp == null) {
          this.last_text = text;
        }
        if (!this.paused) {
          return this.set_cursor(cursor);
        }
      }

      pause(cursor, text) {
        this.paused = false; // so @set_cursor will run if set_text called
        if (text != null) {
          this.set_text(text, true);
        } else {
          this.set_cursor(cursor);
        }
        return this.paused = true;
      }

      continue() {
        this.paused = false;
        return this.set_text(this.last_text);
      }

      set_cursor(cursor) {
        //console.log("set_cursor(#{@elem})", cursor)
        return $(this.elem).css("cursor", cursor);
      }

      make_img(text) {
        var cursor, height, i, id, inset, j, k, len, len1, line, lines, max_width, sel, top, url, voffset;
        // TODO make a speech bubble sort of thing of low opacity but text of high
        //    http://stackoverflow.com/a/8001254/1234699
        //    http://www.scriptol.com/html5/canvas/speech-bubble.php
        id = "temp_TextCursor_canvas";
        sel = `#${id}`;
        $('<canvas>', {
          id: id
        }).appendTo("body");
        this.canvas = $(sel)[0];
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.clearRect(0, 0, this.width, this.height);
        inset = 3;
        top = 10;
        this.ctx.translate(0, this.font_height());
        this.ctx.fillStyle = this.fontFillStyle;
        this.ctx.font = `${this.font_height()}px ${this.face}`;
        this.ctx.textAlign = 'left';
        lines = text.split("\n");
        max_width = 0;
        for (i = j = 0, len = lines.length; j < len; i = ++j) {
          line = lines[i];
          if (line) {
            voffset = this.font_height() * i + top;
            max_width = Math.max(this.ctx.measureText(line).width, max_width);
          }
        }
        height = this.font_height() * lines.length + inset;
        this.draw_bubble(inset, top, max_width + inset * 4, height, this.pointer_height, this.font_height() / 2);
        for (i = k = 0, len1 = lines.length; k < len1; i = ++k) {
          line = lines[i];
          if (line) {
            voffset = this.font_height() * i + top;
            this.ctx.fillText(line, top, voffset);
          }
        }
        url = this.canvas.toDataURL("image/png");
        //url = "http://www.smurp.com/smurp_headon.jpg"
        //$("<img>", {src: url}).appendTo("#gclui")
        cursor = `url(${url}), help`;
        //$("#gclui").css("cursor", cursor)
        $(this.canvas).remove();
        return url;
      }

      draw_bubble(x, y, w, h, pointer_height, radius) {
        /*
        http://www.scriptol.com/html5/canvas/speech-bubble.php
        */
        var b, r;
        r = x + w;
        b = y + h;
        this.ctx.save();
        this.ctx.translate(0, this.font_height() * -1);
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + radius / 2, y - pointer_height);
        this.ctx.lineTo(x + radius * 2, y);
        this.ctx.lineTo(r - radius, y);
        this.ctx.quadraticCurveTo(r, y, r, y + radius);
        this.ctx.lineTo(r, y + h - radius);
        this.ctx.quadraticCurveTo(r, b, r - radius, b);
        this.ctx.lineTo(x + radius, b);
        this.ctx.quadraticCurveTo(x, b, x, b - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        if (this.bgGlobalAlpha != null) {
          this.ctx.save();
          this.ctx.globalAlpha = this.bgGlobalAlpha;
          if (this.bgFillStyle != null) {
            this.ctx.fillStyle = this.bgFillStyle;
            this.ctx.fill();
          }
          this.ctx.restore();
        }
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = this.borderStrokeStyle;
        this.ctx.stroke();
        return this.ctx.restore();
      }

    };

    TextCursor.prototype.fontFillStyle = "black";

    TextCursor.prototype.bgFillStyle = "Yellow";

    TextCursor.prototype.bgGlobalAlpha = 0.6;

    TextCursor.prototype.borderStrokeStyle = "black";

    TextCursor.prototype.face = "sans-serif";

    TextCursor.prototype.width = 128;

    TextCursor.prototype.height = 32;

    TextCursor.prototype.scale = .3;

    TextCursor.prototype.pointer_height = 6;

    return TextCursor;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).TextCursor = TextCursor;

}).call(this);

(function() {
  /*
  TreeCtrl controls TreePicker states: showing, unshowing, mixed for direct and indirect.

   Elements may be in one of these states:
     mixed      - some instances of the node class are selected, but not all
     unshowing  - there are instances but none are selected
     showing    - there are instances and all are selected
     abstract   - there are no instances (but presumably there are subs)
     (empty)    - is empty a better name for taxon with no direct members?
                  Perhaps 'empty' is a legal direct-state and 'abstract' is only
                  sensible as an indirect-state? Do these distinctions make
                  sense in both the Taxon context and the Predicate context?

   What about these theoretical states?
     hidden     - TBD: not sure when hidden is appropriate
                  perhaps abstract predicate subtrees should be hidden
                  ie "there is nothing interesting here, move along"
     emphasized - TBD: mark the class of the focused_node

   Are these states only meaningful in the MVC View context and not the
   Model context? -- where the model context is Taxon and/or Predicate
   while the View context is the TreePicker.  Likewise 'collapse' is
   concept related to the View.  OK so we have View verbs such as:
   * hide
   * emphasize
   * collapse
   * pick (click?)
   and Model verbs such as:

   */
  var TreeCtrl;

  TreeCtrl = class TreeCtrl {
    constructor() {
      this.state = 'empty';
      this.indirect_state = 'empty';
      this.subs = [];
      this.super_class = null;
      this.direct_stats = [0, 0];
      this.dirty = false;
    }

    get_state() {
      if (this.state == null) {
        alert(`${this.id} has no direct state`);
      }
      return this.state;
    }

    get_indirect_state() {
      if (this.indirect_state == null) {
        alert(`${this.id} has no indirect_state`);
      }
      return this.indirect_state;
    }

    register_superclass(super_class) {
      if (super_class === this) {
        return;
      }
      if (this.super_class != null) {
        this.super_class.remove_subclass(this);
      }
      this.super_class = super_class;
      return this.super_class.register_subclass(this);
    }

    remove_subclass(sub_class) {
      var idx;
      idx = this.subs.indexOf(sub_class);
      if (idx > -1) {
        return this.subs.splice(idx, 1);
      }
    }

    register_subclass(sub_class) {
      return this.subs.push(sub_class);
    }

    recalc_states() {
      this.direct_stats = this.recalc_direct_stats(); // eg [3, 60]
      this.indirect_stats = this.recalc_indirect_stats([0, 0]);
      this.state = this.recalc_direct_state(); // eg empty|unshowing|mixed|showing
      this.indirect_state = this.recalc_indirect_state(); // same as above
    }

    recalc_indirect_state() {
      var consensus, i, kid, kid_ind_stt, len, ref;
      //return @translate_stats_to_state @indirect_state
      if (this.subs.length === 0) {
        return this.state; // eg 0/0
      }
      if (this.state === 'mixed') {
        return 'mixed'; // eg 3/6
      }
      consensus = this.get_state(); // variable for legibility and performance
      ref = this.subs;
      for (i = 0, len = ref.length; i < len; i++) {
        kid = ref[i];
        kid_ind_stt = kid.get_indirect_state();
        //  debugger
        if (kid_ind_stt !== consensus) {
          if (consensus === 'empty' || consensus === 'hidden') {
            consensus = kid_ind_stt;
          } else if (kid_ind_stt !== 'empty' && kid_ind_stt !== 'hidden') {
            return "mixed";
          }
        }
      }
      return consensus;
    }

    set_dirty() {
      this.dirty = true;
      if (this.super_class != null) {
        return this.super_class.set_dirty();
      }
    }

    update_state(inst, change) {
      if (inst != null) {
        this.change_map[change].acquire(inst);
      }
      return this.set_dirty();
    }

    //@fire_changeEvent_if_needed()
    clean_up_dirt() {
      var evt, i, kid, len, old_indirect_state, old_state, ref, updating_stats;
      if (!this.dirty) {
        return;
      }
      this.dirty = false;
      // FIXME fold the subroutines into this method for a single pass
      // FIXME make use of the edge and change hints in the single pass
      // terminology:
      //   selected edge:  an edge (shown or not) to or from a node in the selected_set
      // roughly: all_shown, none_shown, mixed, hidden
      //   are all the selected edges shown?
      //   are none of the selected edges shown?
      //   are strictly some of the selected edges shown?
      //   are there no selected edges?
      old_state = this.state;
      old_indirect_state = this.indirect_state;
      ref = this.subs;
      for (i = 0, len = ref.length; i < len; i++) {
        kid = ref[i];
        kid.clean_up_dirt();
      }
      this.recalc_states();
      updating_stats = true; // TODO make this settable by user
      if (updating_stats || old_state !== this.state || old_indirect_state !== this.indirect_state) {
        if (window.suspend_updates) {
          return;
        }
        evt = new CustomEvent(this.custom_event_name, {
          detail: {
            target_id: this.lid,
            target: this,
            old_state: old_state,
            new_state: this.state,
            old_indirect_state: old_indirect_state,
            new_indirect_state: this.indirect_state,
            payload: this.get_payload_string(),
            collapsed_payload: this.get_collapsed_payload_string()
          },
          bubbles: true,
          cancelable: true
        });
        return window.dispatchEvent(evt);
      }
    }

    //if @super_class?
    //  @super_class.fire_changeEvent_if_needed()
    format_stats(stats) {
      return `${stats[0]}/${stats[1]}`;
    }

    translate_stats_to_state(stats) {
      if (stats[1] === 0) {
        return "empty";
      }
      if (stats[0] === 0) {
        return "unshowing";
      }
      if (stats[0] === stats[1]) {
        return "showing";
      }
      return "mixed";
    }

    recalc_direct_state() {
      return this.translate_stats_to_state(this.direct_stats);
    }

    get_payload_string() {
      return this.format_stats(this.direct_stats);
    }

    get_collapsed_payload_string() {
      return this.format_stats(this.indirect_stats);
    }

    recalc_indirect_stats(stats) {
      var i, len, ref, sub;
      stats[0] += this.direct_stats[0];
      stats[1] += this.direct_stats[1];
      if (this.subs.length > 0) {
        ref = this.subs;
        for (i = 0, len = ref.length; i < len; i++) {
          sub = ref[i];
          sub.recalc_indirect_stats(stats);
        }
      }
      return stats;
    }

  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).TreeCtrl = TreeCtrl;

}).call(this);

(function() {
  /*
  Build and control a hierarchic menu of arbitrarily nested divs looking like:

      +-----------------------+
      |      +---------------+|
      |      |        +-----+||
      | All▼ |People▼ |Men  |||
      |      |        +-----+||
      |      |        +-----+||
      |      |        |Women|||
      |      |        +-----+||
      |      +---------------+|
      +-----------------------+

  * The user can toggle between collapsed and expanded using the triangles.
  * On the other hand, branches in the tree which are empty are hidden.
  * Clicking uncollapsed branches cycles just their selectedness not their children.
  * Clicking collapsed branches cycles the selectedness of them and their children.

  * <div class="container"> a container holds one or more contents
  * <div class="contents"> a content (ie a node such as THING) may have a container for it kids
  * so the CONTENT with id=Thing is within the root CONTAINER
       and the Thing CONTENT itself holds a CONTAINER with the child CONTENTS of its subclasses

  Possible Bug: it appears that <div class="container" id="classes"> has a redundant child
                  which looks like <div class="container">.
                It is unclear why this is needed.  Containers should not directly hold containers.
   */
  var TreePicker, uniquer;

  uniquer = require("uniquer").uniquer;

  TreePicker = (function() {
    class TreePicker {
      constructor(elem1, root, extra_classes, needs_expander, use_name_as_label, squash_case_during_sort, style_context_selector) {
        this.click_handler = this.click_handler.bind(this);
        this.handle_click = this.handle_click.bind(this);
        // In ballrm.nq Place has direct_state = undefined because Place has
        // no direct instances so it never has an explicit state set.
        // Should there be a special state for such cases?
        // It would be useful to be able to style such nodes to communicate
        // that they are unpopulated / can't really be selected, etc.
        // Perhaps they could be italicized because they deserve a color since
        // they might have indirect children.
        this.onChangeState = this.onChangeState.bind(this);
        this.elem = elem1;
        this.needs_expander = needs_expander;
        this.use_name_as_label = use_name_as_label;
        this.squash_case_during_sort = squash_case_during_sort;
        this.style_context_selector = style_context_selector;
        // The @style_context_selector is only really needed by colortreepicker
        if (extra_classes != null) {
          this.extra_classes = extra_classes;
        }
        if (this.use_name_as_label == null) {
          this.use_name_as_label = true;
        }
        if (this.squash_case_during_sort == null) {
          this.squash_case_during_sort = true;
        }
        this.id_to_elem = {};
        this.id_to_elem['/'] = this.elem;
        this.ids_in_arrival_order = [root];
        this.id_is_abstract = {};
        this.id_is_collapsed = {};
        this.id_to_state = {
          true: {},
          false: {}
        };
        this.id_to_parent = {
          root: '/'
        };
        this.id_to_children = {
          '/': [root]
        };
        this.id_to_payload_collapsed = {};
        this.id_to_payload_expanded = {};
        this.id_to_name = {};
        this.set_abstract(root); // FIXME is this needed?
        this.set_abstract('/');
        this.set_abstract('root'); // FIXME duplication?!?
      }

      get_my_id() {
        return this.elem.attr("id");
      }

      shield() {
        var rect, styles;
        if (!this._shield) {
          d3.select(this.elem[0][0]).style('position', 'relative');
          this._shield = d3.select(this.elem[0][0]).insert('div');
          this._shield.classed('shield', true);
        }
        rect = d3.select(this.elem[0][0]).node().getBoundingClientRect();
        styles = {
          display: 'block',
          width: `${rect.width}px`,
          height: `${rect.height}px`
        };
        this._shield.style(styles);
        return this;
      }

      unshield() {
        this._shield.style({
          display: 'none'
        });
        return this;
      }

      set_abstract(id) {
        return this.id_is_abstract[id] = true;
      }

      get_abstract_count() {
        return Object.keys(this.id_is_abstract).length;
      }

      is_abstract(id) { // ie class has no direct instances but maybe subclasses
        var tmp;
        tmp = this.id_is_abstract[id];
        return (tmp != null) && tmp;
      }

      uri_to_js_id(uri) {
        return uniquer(uri);
      }

      get_childrens_ids(parent_id) {
        if (parent_id == null) {
          parent_id = '/'; // if no parent indicated, return root's kids
        }
        return this.id_to_children[parent_id] || [];
      }

      get_container_elem_within_id(an_id) {
        var content_elem;
        // the div with class='container' holding class='contents' divs
        content_elem = this.id_to_elem[an_id][0][0];
        return content_elem.querySelector('.container');
      }

      resort_recursively(an_id) {
        var child_elem, child_id, container_elem, i, j, kids_ids, len, len1, sort_by_first_item, val, val_elem_pair, val_elem_pairs;
        if (an_id == null) {
          an_id = '/'; // if an_id not provided, then sort the root
        }
        kids_ids = this.get_childrens_ids(an_id);
        if (!kids_ids || !kids_ids.length) {
          return;
        }
        val_elem_pairs = [];
        sort_by_first_item = function(a, b) {
          return a[0].localeCompare(b[0]);
        };
        for (i = 0, len = kids_ids.length; i < len; i++) {
          child_id = kids_ids[i];
          this.resort_recursively(child_id);
          val = this.get_comparison_value(child_id, this.id_to_name[child_id]);
          child_elem = this.id_to_elem[child_id][0][0];
          this.update_label_for_node(child_id, child_elem);
          val_elem_pairs.push([val, child_elem]);
        }
        val_elem_pairs.sort(sort_by_first_item);
        container_elem = this.get_container_elem_within_id(an_id);
        if (!container_elem) {
          throw "no container_elem";
        }
        for (j = 0, len1 = val_elem_pairs.length; j < len1; j++) {
          val_elem_pair = val_elem_pairs[j];
          child_elem = val_elem_pair[1];
          container_elem.appendChild(child_elem);
        }
      }

      update_label_for_node(node_id, node_elem) { // passing node_elem is optional
        var label_elem;
        // This takes the current value of @id_to_name[node_id] and displays it in the HTML.
        // Why? Because the label might be a MultiString whose language might have changed.
        if (node_elem == null) {
          node_elem = this.id_to_elem[node_id];
        }
        label_elem = node_elem.querySelector('p.treepicker-label span.label');
        if (label_elem != null) {
          return label_elem.textContent = this.id_to_name[node_id];
        }
      }

      get_comparison_value(node_id, label) {
        var this_term;
        if (this.use_name_as_label) {
          this_term = label || node_id;
        } else {
          this_term = node_id;
        }
        if (this.squash_case_during_sort === true) { // expose this as a setting
          this_term = this_term.toLowerCase();
        }
        return this_term;
      }

      add_alphabetically(i_am_in, node_id, label) {
        var container, elem, i, label_lower, len, other_term, ref, this_term;
        label_lower = label.toLowerCase();
        container = i_am_in[0][0];
        this_term = this.get_comparison_value(node_id, label);
        ref = container.children;
        for (i = 0, len = ref.length; i < len; i++) {
          elem = ref[i];
          other_term = this.get_comparison_value(elem.id, this.id_to_name[elem.id]);
          if (other_term > this_term) {
            return this.add_to_elem_before(i_am_in, node_id, "#" + elem.id, label);
          }
        }
        // fall through and append if it comes before nothing
        return this.add_to_elem_before(i_am_in, node_id, void 0, label);
      }

      add_to_elem_before(i_am_in, node_id, before, label) {
        return i_am_in.insert('div', before).attr('class', 'contents').attr('id', node_id); // insert just appends if before is undef
      }

      show_tree(tree, i_am_in, listener, top) {
        var contents_of_me, css_class, i, label, len, my_contents, node_id, picker, ref, rest, results;
        // http://stackoverflow.com/questions/14511872
        top = (top == null) || top;
        results = [];
        for (node_id in tree) {
          rest = tree[node_id];
          label = rest[0];
          //label = "┗ " + rest[0]

          // FIXME the creation of a node in the tree should be extracted into a method
          //       rather than being spread across this one and add_alphabetically.
          //       Setting @id_to_elem[node_id] should be in the new method
          contents_of_me = this.add_alphabetically(i_am_in, node_id, label);
          this.id_to_elem[node_id] = contents_of_me;
          picker = this;
          contents_of_me.on('click', this.click_handler);
          contents_of_me.append("p").attr("class", "treepicker-label").append('span').attr('class', 'label').text(label);
          if (rest.length > 1) {
            my_contents = this.get_or_create_container(contents_of_me);
            if (top && this.extra_classes) {
              ref = this.extra_classes;
              for (i = 0, len = ref.length; i < len; i++) {
                css_class = ref[i];
                my_contents.classed(css_class, true);
              }
            }
            results.push(this.show_tree(rest[1], my_contents, listener, false));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }

      click_handler() {
        var elem, id, picker;
        picker = this;
        elem = d3.select(d3.event.target);
        d3.event.stopPropagation();
        id = elem.node().id;
        while (!id) {
          elem = d3.select(elem.node().parentElement);
          id = elem.node().id;
        }
        picker.handle_click(id); //, send_leafward)
        // This is hacky but ColorTreePicker.click_handler() needs the id too
        return id;
      }

      handle_click(id) {
        // If this is called then id itself was itself click, not triggered by recursion
        return this.go_to_next_state(id, this.get_next_state_args(id));
      }

      get_next_state_args(id) {
        var elem, is_treepicker_collapsed, is_treepicker_indirect_showing, is_treepicker_showing, new_state;
        elem = this.id_to_elem[id];
        if (!elem) {
          throw new Error(`elem for '${id}' not found`);
        }
        is_treepicker_collapsed = elem.classed('treepicker-collapse');
        is_treepicker_showing = elem.classed('treepicker-showing');
        is_treepicker_indirect_showing = elem.classed('treepicker-indirect-showing');
        // If the state is not 'showing' then make it so, otherwise 'unshowing'.
        // if it is not currently showing.
        new_state = 'showing';
        if (is_treepicker_collapsed) {
          if (is_treepicker_indirect_showing) {
            new_state = 'unshowing';
          }
        } else {
          if (is_treepicker_showing) {
            new_state = 'unshowing';
          }
        }
        return {
          new_state: new_state,
          collapsed: is_treepicker_collapsed,
          original_click: true
        };
      }

      go_to_next_state(id, args) {
        var listener, send_leafward;
        listener = this.click_listener;
        send_leafward = this.id_is_collapsed[id];
        return this.effect_click(id, args.new_state, send_leafward, listener, args);
      }

      effect_click(id, new_state, send_leafward, listener, args) {
        var child_id, elem, i, kids, len;
        if (send_leafward) {
          kids = this.id_to_children[id];
          if (kids != null) {
            for (i = 0, len = kids.length; i < len; i++) {
              child_id = kids[i];
              if (child_id !== id) {
                this.effect_click(child_id, new_state, send_leafward, listener);
              }
            }
          }
        }
        if (listener != null) {
          elem = this.id_to_elem[id];
          return listener.call(this, id, new_state, elem, args); // now this==picker not the event // TODO(shawn) replace with custom event?
        }
      }

      get_or_create_container(contents) {
        var r;
        r = contents.select(".container");
        if (r[0][0] !== null) {
          return r;
        }
        return contents.append('div').attr('class', 'container');
      }

      get_top() {
        return this.ids_in_arrival_order[0] || this.id;
      }

      set_name_for_id(name, id) {
        if (this.use_name_as_label) {
          return this.id_to_name[id] = name;
        } else {
          return this.id_to_name[id] = id;
        }
      }

      add(new_id, parent_id, name, listener) {
        var branch, container, parent;
        this.ids_in_arrival_order.push(new_id);
        parent_id = (parent_id != null) && parent_id || this.get_top();
        new_id = this.uri_to_js_id(new_id);
        this.id_is_collapsed[new_id] = false;
        parent_id = this.uri_to_js_id(parent_id);
        this.id_to_parent[new_id] = parent_id;
        if (this.id_to_children[parent_id] == null) {
          this.id_to_children[parent_id] = [];
        }
        if (new_id !== parent_id) {
          this.id_to_children[parent_id].push(new_id);
        }
        //@id_to_state[true][new_id] = "empty" # default meaning "no instances"
        //@id_to_state[false][new_id] = "empty" # default meaning "no instances"
        name = (name != null) && name || new_id;
        branch = {};
        branch[new_id] = [name || new_id];
        this.id_to_name[new_id] = name;
        parent = this.id_to_elem[parent_id] || this.elem;
        container = d3.select(this.get_or_create_container(parent)[0][0]);
        if (this.needs_expander) {
          this.get_or_create_expander(parent, parent_id);
        }
        return this.show_tree(branch, container, listener);
      }

      get_or_create_expander(thing, id) {
        var exp, picker, r;
        if ((thing != null) && thing) {
          r = thing.select(".expander");
          if (r[0][0] !== null) {
            return r;
          }
          exp = thing.select(".treepicker-label").append('span').classed("expander", true).text(this.collapser_str);
          this.id_is_collapsed[id] = false;
          picker = this;
          return exp.on('click', () => { // TODO: make this function a method on the class
            var id2;
            d3.event.stopPropagation();
            id2 = exp[0][0].parentNode.parentNode.getAttribute("id");
            if (id2 !== id) {
              console.error(`expander.click() ${id} <> ${id2}`);
            }
            if (this.id_is_collapsed[id2]) {
              return this.expand_by_id(id2);
            } else {
              return this.collapse_by_id(id2);
            }
          });
        }
      }

      collapse_by_id(id) {
        var elem, exp;
        this.id_is_collapsed[id] = true;
        elem = this.id_to_elem[id];
        elem.classed("treepicker-collapse", true);
        exp = elem.select(".expander");
        exp.text(this.expander_str);
        return this.update_payload_by_id(id);
      }

      expand_by_id(id) {
        var elem, exp;
        this.id_is_collapsed[id] = false;
        elem = this.id_to_elem[id];
        elem.classed("treepicker-collapse", false);
        exp = elem.select(".expander");
        exp.text(this.collapser_str);
        return this.update_payload_by_id(id);
      }

      expand_all() {
        var collapsed, id, ref, results;
        ref = this.id_is_collapsed;
        results = [];
        for (id in ref) {
          collapsed = ref[id];
          if (collapsed) {
            results.push(this.expand_by_id(id));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }

      get_or_create_payload(thing) {
        var r, thing_id;
        if ((thing != null) && thing) {
          thing_id = thing[0][0].id;
          r = thing.select(`#${thing_id} > .treepicker-label > .payload`);
          if (r[0][0] !== null) {
            return r;
          }
          return thing.select(".treepicker-label").append('span').classed("payload", true);
        }
      }

      set_payload(id, value) {
        var elem, payload;
        elem = this.id_to_elem[id];
        if (elem == null) { //and elem isnt null
          console.warn(`set_payload could not find '${id}'`);
          return;
        }
        payload = this.get_or_create_payload(elem);
        if (payload != null) {
          if (value != null) {
            return payload.text(value);
          } else {
            return payload.remove();
          }
        }
      }

      set_title(id, title) {
        var elem;
        elem = this.id_to_elem[id];
        if (elem != null) {
          return elem.attr("title", title);
        }
      }

      set_direct_state(id, state, old_state) {
        var elem;
        if (old_state == null) {
          old_state = this.id_to_state[true][id];
        }
        this.id_to_state[true][id] = state;
        elem = this.id_to_elem[id];
        if (!elem) {
          console.warn(`set_direct_state(${id}, ${state}, ${old_state}) NO elem for id on @id_to_elem`);
          return;
        }
        if (old_state != null) {
          elem.classed(`treepicker-${old_state}`, false);
        }
        if (state != null) {
          return elem.classed(`treepicker-${state}`, true);
        }
      }

      set_indirect_state(id, state, old_state) {
        var elem;
        if (state == null) {
          console.error(`${this.get_my_id()}.set_indirect_state()`, arguments, "state should never be", void 0);
        }
        if (old_state == null) {
          old_state = this.id_to_state[false][id];
        }
        this.id_to_state[false][id] = state; // false means indirect
        elem = this.id_to_elem[id];
        if (!elem) {
          console.warn(`set_indirect_state(${id}, ${state}, ${old_state}) NO elem for id on @id_to_elem`);
          return;
        }
        if (old_state != null) {
          elem.classed(`treepicker-indirect-${old_state}`, false);
        }
        if (state != null) {
          return elem.classed(`treepicker-indirect-${state}`, true);
        }
      }

      set_both_states_by_id(id, direct_state, indirect_state, old_state, old_indirect_state) {
        this.set_direct_state(id, direct_state, old_state);
        return this.set_indirect_state(id, indirect_state, old_indirect_state);
      }

      // the responsibility for knowing that parent state should change is Taxons
      is_leaf(id) {
        return (this.id_to_children[id] == null) || this.id_to_children[id].length === 0;
      }

      update_parent_indirect_state(id) {
        var child_indirect_state, child_is_leaf, new_parent_indirect_state, parent_id, parent_indirect_state;
        // Update the indirect_state of the parents up the tree
        parent_id = this.id_to_parent[id];
        child_is_leaf = this.is_leaf(id);
        if ((parent_id != null) && parent_id !== id) {
          child_indirect_state = this.id_to_state[false][id];
          parent_indirect_state = this.id_to_state[false][parent_id];
          //if not parent_indirect_state?
          // console.warn("#{my_id}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state})
          // use the parent's direct state as a default
          // new_parent_indirect_state = @id_to_state[true][parent_id]
          new_parent_indirect_state = parent_indirect_state;
          if (child_indirect_state !== parent_indirect_state) {
            new_parent_indirect_state = this.calc_new_indirect_state(parent_id);
          }
          if (new_parent_indirect_state !== parent_indirect_state) {
            this.set_indirect_state(parent_id, new_parent_indirect_state);
          }
          // a change has happened, so propagate rootward
          //else
          //  console.info("#{@get_my_id()}.update_parent_indirect_state()",id, "still state:", new_parent_indirect_state)
          // console.info("#{@get_my_id()}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state, new_parent_indirect_state: new_parent_indirect_state})
          return this.update_parent_indirect_state(parent_id);
        }
      }

      calc_new_indirect_state(id) {
        var child_id, child_indirect_state, i, len, new_indirect_state, old_direct_state, old_indirect_state, ref;
        // If every time a node has its direct state change it tells its
        // parent to check whether the parents direct children share that
        // parents direct state then everybodys indirect state can be maintained.
        old_indirect_state = this.id_to_state[false][id];
        old_direct_state = this.id_to_state[true][id];
        ref = this.id_to_children[id];
        for (i = 0, len = ref.length; i < len; i++) {
          child_id = ref[i];
          child_indirect_state = this.id_to_state[false][child_id];
          if (child_indirect_state !== new_indirect_state) {
            if (typeof new_indirect_state === "undefined" || new_indirect_state === null) {
              new_indirect_state = child_indirect_state;
            } else {
              new_indirect_state = "mixed";
            }
          }
          if (new_indirect_state === 'mixed') {
            // once we are mixed there is no going back, so break
            break;
          }
        }
        if ((old_direct_state != null) && new_indirect_state !== old_direct_state) {
          new_indirect_state = "mixed";
        }
        return new_indirect_state;
      }

      get_state_by_id(id, direct_only) {
        if (direct_only == null) {
          direct_only = true;
        }
        return this.id_to_state[direct_only][id];
      }

      onChangeState(evt) {
        var det;
        det = evt.detail;
        if (det.new_indirect_state != null) {
          this.set_both_states_by_id(det.target_id, det.new_state, det.new_indirect_state, det.old_state, det.old_indirect_state);
        } else {
          this.set_state_by_id(det.target_id, det.new_state, det.old_state);
        }
        return this.cache_payload(det);
      }

      cache_payload(det) {
        var update;
        update = false;
        if (det.collapsed_payload != null) {
          update = true;
          this.id_to_payload_collapsed[det.target_id] = det.collapsed_payload;
        }
        if (det.payload != null) {
          update = true;
          this.id_to_payload_expanded[det.target_id] = det.payload;
        }
        if (update) {
          return this.update_payload_by_id(det.target_id);
        }
      }

      update_payload_by_id(id) {
        var payload;
        if (this.id_is_collapsed[id]) {
          payload = this.id_to_payload_collapsed[id];
          if (payload != null) {
            return this.set_payload(id, payload);
          }
        } else {
          payload = this.id_to_payload_expanded[id];
          if (payload != null) {
            return this.set_payload(id, payload);
          }
        }
      }

    };

    TreePicker.prototype.collapser_str = "▼"; // 0x25bc

    TreePicker.prototype.expander_str = "▶"; // 0x25b6

    return TreePicker;

  }).call(this);

  (typeof exports !== "undefined" && exports !== null ? exports : this).TreePicker = TreePicker;

}).call(this);

(function() {
  // FIXME this should be renamed to make_dom_safe_id()
  var uniquer;

  uniquer = function(str) {
    var m, retval;
    m = str.match(/([\w\d\_\-]+)$/g);
    if (m) {
      retval = m[0];
    } else {
      retval = str.replace(/http(s)?\:/, '').replace(/\//, "__");
      retval = retval.replace(/[\.\;\/]/g, '_');
      retval = retval.replace(/^\_*/g, ''); // leading _
      retval = retval.replace(/\_*$/g, ''); // trailing _
    }
    if (retval.match(/^[^a-zA-Z]/)) {
      retval = `x${retval}`;
    }
    return retval;
  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).uniquer = uniquer;

}).call(this);
