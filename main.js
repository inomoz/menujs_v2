var tableEditableBefore;
var tableEditable = $('#tableEditable');
var minRating = 0.87; // string similarity

var gcd = function(a, b) {
  if (b < 0.0000001) return a;                // Since there is a limited precision we need to limit the value.

  return gcd(b, Math.floor(a % b));           // Discard any fractions due to limitations in precision.
};

var rationalizeNumber = function(fraction) {
    if (fraction % 1 != 0) {
        fractionValues = fraction.toString().split('.');
        baseNumber = fractionValues[0];
        fraction = '0.' + fractionValues[1]
        var len = fraction.length - 2;

        var denominator = Math.pow(10, len);
        var numerator = fraction * denominator;

        var divisor = gcd(numerator, denominator);    // Should be 5

        numerator /= divisor;                         // Should be 687
        denominator /= divisor;                       // Should be 2000
        if (baseNumber > 0){
            return baseNumber + " " + Math.floor(numerator) + '/' + Math.floor(denominator);
        }
        else{
            return Math.floor(numerator) + '/' + Math.floor(denominator);
        }

    }

    return fraction.toString();
};

function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

function hasNumber(myString) {
  return /\d/.test(myString);
}

function toDeci(fraction) {
    fraction = fraction.toString();
    var result,wholeNum=0, frac, deci=0;
    if(fraction.search('/') >=0){
        if(fraction.search('-') >=0){
            wholeNum = fraction.split('-');
            frac = wholeNum[1];
            wholeNum = parseInt(wholeNum,10);
        }else{
            frac = fraction;
        }
        if(fraction.search('/') >=0){
            frac =  frac.split('/');
            deci = parseInt(frac[0], 10) / parseInt(frac[1], 10);
        }
        result = wholeNum+deci;
    } else{
        result = parseFloat(fraction)
    }
    return result;
}

function syntaxHighlight(json) {
    if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

if (tableEditable){
    tableEditable.on('focus', function() {
      tableEditableBefore = $(this).html();
    }).on('blur keyup paste', function() {
      if (tableEditableBefore != $(this).html()) { $(this).trigger('change'); }
    });

    (function( $ ){
       $.fn.generateGroceryTable = function() {

          var groceryElements = {
            'Produce': {'units': [], 'values': [], 'generated': {}},
            'Meat': {'units': [], 'values': [], 'generated': {}},
            'Frozen/Dairy': {'units': [], 'values': [], 'generated': {}},
            'Dry Goods': {'units': [], 'values': [], 'generated': {}}
          };
          // Hardcoded columns
          var groceryColumns = [5,6,7,8];

          var productsTableData = this.tableToJSON({
              onlyColumns: groceryColumns,
              ignoreEmptyRows: true,
              extractor : function(cellIndex, $cell) {
                // get text from the span inside table cells;
                // if empty or non-existant, get the cell text
                return $cell.find('span').text() || $cell.text();
              }
          });

          $.each(productsTableData, function( productIndex, productValue ) {
              $.each(Object.keys(groceryElements), function( index, headKey ) {
                 if (productValue && productValue.hasOwnProperty(headKey)){
                    var lines = productValue[headKey].replace('<br>', '\n').replace('<br/>', '\n').split("\n");



                    $.each(lines, function( index, line ) {
                        line = line.trim();

                        if (!line.length || line.length < 2){
                            return
                        }

                        var unit;
                        var currentUnit = 0;
                        var unitData = [];

                        line = line.trim().replace(/^-/g,'').trim();

                        var lineData = line.match(/(^[0-9 \.\-\/]+)(.*)/);
                        if (lineData && lineData.length === 3){
                            if (line.includes('to thicken')){
                                console.log(lineData);
                            }
                            lineData[1] = lineData[1].trim().replace(/^-/g,'')
                            lineData[1] = lineData[1].replace('1-2', '2');

                            unitData = lineData[1].split(' ');
                            line = lineData[2];

                            for (i = 0; i < unitData.length; i++) {
                                unit = unitData[i];

                                var convertedUnit = parseFloat(unit);
                                if (!isNaN(convertedUnit)){
                                    currentUnit += convertedUnit;
                                }
                                else{
                                    convertedUnit = toDeci(unit);
                                    if (!isNaN(convertedUnit)){
                                        currentUnit += convertedUnit;
                                    }
                                    else{
                                        currentUnit += 1;
                                    }
                                }
                            }
                        }
                        else{
                            currentUnit = 1;
                        }

                        if (line && currentUnit){
                            groceryElements[headKey]['units'].push(currentUnit);
                            groceryElements[headKey]['values'].push(line);
                        }
                    });
                 }
              });
          });


          $.each(groceryElements, function(headKey, itemData){
            var units = itemData['units'];
            var values = itemData['values'];
            var generatedValues = {};
            var denyIndexes = [];

            $.each(values, function(index){
                var currentValue = values[index];
                var currentUnit = units[index];

                if (!currentUnit){
                    console.log('bad unit ' + currentUnit)
                    return
                }

                if (!(currentValue in generatedValues)){
                     generatedValues[currentValue] = currentUnit;
                     denyIndexes.push(index);
                     return
                }

                $.each(values, function(idx, item) {
                    if (denyIndexes.includes(idx)){
                        return
                    }

                    var rating = stringSimilarity.compareTwoStrings(currentValue, item);
                    if (rating >= minRating) {
                        denyIndexes.push(idx);
                        generatedValues[currentValue] += currentUnit;
                    }
                } );

            });

            $.each(generatedValues, function(index){
                generatedValues[index] = rationalizeNumber(generatedValues[index]);
            });

            groceryElements[headKey] = generatedValues
            console.log('#' + headKey.replace('/', '').replace(' ', ''));

            $('#' + headKey.replace('/', '').replace(' ', '')).html(syntaxHighlight(generatedValues));

          })


          return null;
       };
    })( jQuery );

    // We changed something
    tableEditable.on('change', function() {
        var groceryPDFTable = tableEditable.generateGroceryTable();
    });
}


