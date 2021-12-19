'use strict';


var minRating = 0.87; // string similarity

Array.prototype.insert = function ( index, item ) {
    this.splice( index, 0, item );
};

var gcd = function(a, b) {
  if (b < 0.0000001) return a;                // Since there is a limited precision we need to limit the value.

  return gcd(b, Math.floor(a % b));           // Discard any fractions due to limitations in precision.
};

var rationalizeNumber = function(fraction) {
    if (fraction % 1 != 0) {
        var fractionValues = fraction.toString().split('.');
        var baseNumber = fractionValues[0];
        var fraction = '0.' + fractionValues[1]
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

// Main table
var LightTableFilter = (function(Arr) {
    var _input;

    function _onInputEvent(e) {
        _input = e.target;
        var val = _input.value.toLowerCase();
        status = false;

        var tables = document.getElementsByClassName(_input.getAttribute('data-table'));
        Arr.forEach.call(tables, function(table) {
            Arr.forEach.call(table.tBodies, function(tbody) {
                Arr.forEach.call(tbody.rows, function(row){
                    _filter(row, val);
                });
            });
        });
    }

    function _filter(row, val, negative, split) {
        split = typeof split !== 'undefined' ? split : '';

        var searchColumns = Array.from(row.querySelectorAll('td:not(:first-of-type)'));
        var text = '';

        Arr.forEach.call(searchColumns, function(searchColumn) {
            text += $(searchColumn).find('.tablesaw-cell-content').text().toLowerCase();
        });

        if (typeof val === 'string'){
            if (negative){
                row.style.display = text.indexOf(val) !== -1 ? 'none' : 'table-row';
                return text.indexOf(val) !== -1
            }
            else{
                row.style.display = text.indexOf(val) === -1 ? 'none' : 'table-row';
                return text.indexOf(val) !== -1
            }
        }
    }

    function  _filter_checkboxes(data, row) {
        var textArrays = {};
        var checkedValues = {};

        // Show row by default
        $(row).removeClass('is-hidden');

        $.each(data, function (id, column_data) {
            var textRaw = $(row).find('td:nth(' + id  + ')').find('.tablesaw-cell-content').text().replace(/\s+/g, '').toLowerCase();
            textArrays[id] = []; // values of text!
            checkedValues[id] = [];

            if (parseInt(id) === 3 && textRaw.indexOf('/')){ // #3 column contains specific data type! - V = vegetarian LS = lowsodium D = diabeticfriendly LC = lowcarb LH = lowcholesterol GF = glutenfree DF = dairyfree
                textRaw = textRaw.split(' ').join('')
                textRaw = textRaw.replace(/(?:\r\n|\r|\n)/g, '/');
                textRaw = textRaw.split('/');
                for (var i=textRaw.length-1; i>=0; i--) {
                    textRaw[i].replace(/\s+/g, '');
                    textArrays[id].push(textRaw[i]);
                }
            }
            else{
                textArrays[id].push(textRaw);
            }
            // get "checked" values
            $.each(column_data, function (index, checkbox) {
                if (checkbox.checked){
                    checkedValues[id].push(checkbox.value.toLowerCase())
                }
            });
        });

        var filter_order = [2, 4, 3];
        $.each(filter_order, function (index, id) {

            var currentTextArray = textArrays[id];
            var currentCheckedValues = checkedValues[id];

            if (currentCheckedValues.length > 0){
                var found = false;

                $.each(currentCheckedValues, function (index, value) {
                    if ($.inArray( value, currentTextArray ) !== -1){
                        found = true;
                    }
                });

                if (!found)
                    $(row).addClass('is-hidden');
            }
        });
    }

    return {
        init: function() {
            // inputs filters
            var inputs = document.getElementsByClassName('search-input');
            Arr.forEach.call(inputs, function(input) {
                input.oninput = _onInputEvent;
            });

            // checkboxes filters
            var $multiselects = $('[data-toggle="multiselect"]');
            var $rows = $('#tableEditable tbody tr');

            // Generate full checkboxes data
            var data = {};
            $.each($multiselects, function (i, multiselect) {
                var id = $(multiselect).data('row');
                data[id] = $(multiselect).find('input:checkbox').map(function() {
                    return {value: $(this).val(), checked:$(this).is(':checked')};
                }).toArray();
            });

            $('[data-toggle="multiselect"] input:checkbox').on('change', function() {
                var id = $(this).closest('[data-toggle="multiselect"]').data('row');
                var value = $(this).val();
                var checked = $(this).is(':checked');

                for (var i in data[id]) {
                    if (data[id][i].value === value) {
                        data[id][i].value = value;
                        data[id][i].checked = checked;
                    }
                }


                $.each($rows, function(i, row) {
                    _filter_checkboxes(data, row);
                });
            });

        }
    };
})(Array.prototype);


// Grocery List generation
function generateGroceryTable($table) {
    var groceryElements = {
        'Produce': {'units': [], 'values': [], 'generated': []},
        'Meat': {'units': [], 'values': [], 'generated': []},
        'Frozen/Dairy': {'units': [], 'values': [], 'generated': []},
        'Dry Goods': {'units': [], 'values': [], 'generated': []}
    };
    // Hardcoded columns
    var groceryColumns = [5, 6, 7, 8];
    var groceryData = [];

    var productsTableData = $table.tableToJSON({
        onlyColumns: groceryColumns,
        ignoreEmptyRows: true,
        ignoreHiddenRows: true,
        extractor: function (cellIndex, $cell) {
            // get text from the span inside table cells;
            // if empty or non-existant, get the cell text
            var $cellParent = $cell.parent();
            if (!$cellParent.hasClass('is-disabled')) {
                return $cell.find('p').text() || null;
            }
        }
    });

    $.each(productsTableData, function (productIndex, productValue) {
        $.each(Object.keys(groceryElements), function (index, headKey) {
            if (productValue && productValue.hasOwnProperty(headKey) && typeof productValue[headKey] === 'string') {
                var lines = productValue[headKey].replace('<br>', '\n').replace('<br/>', '\n').split("\n");

                $.each(lines, function (index, line) {
                    line = line.trim();

                    if (!line.length || line.length < 2) {
                        return
                    }

                    var unit;
                    var currentUnit = 0;
                    var unitData = [];

                    line = line.trim().replace(/^-/g, '').trim();

                    var lineData = line.match(/(^[0-9 \.\-\/]+)(.*)/);
                    if (lineData && lineData.length === 3) {
                        lineData[1] = lineData[1].trim().replace(/^-/g, '')
                        lineData[1] = lineData[1].replace('1-2', '2');

                        unitData = lineData[1].split(' ');
                        line = lineData[2];
                        var i;

                        for (i = 0; i < unitData.length; i++) {
                            unit = unitData[i];

                            if (unit.includes('/')) {
                                var convertedUnit = toDeci(unit);
                            } else {
                                var convertedUnit = parseFloat(unit);
                            }


                            if (!isNaN(convertedUnit)) {
                                currentUnit += convertedUnit;
                            } else {
                                currentUnit += 1;
                            }
                        }
                    } else {
                        currentUnit = 1;
                    }

                    if (line && currentUnit) {
                        groceryElements[headKey]['units'].push(currentUnit);
                        groceryElements[headKey]['values'].push(line);
                    }
                });
            }
        });
    });

    var headKeyIndex = 0;
    $.each(groceryElements, function (headKey, itemData) {
        var units = itemData['units'];
        var values = itemData['values'];
        var generatedValues = {};
        var denyIndexes = [];

        $.each(values, function (index) {
            var currentValue = values[index];
            var currentUnit = units[index];

            if (!currentUnit) {
                console.log('bad unit ' + currentUnit)
                return
            }

            if (!(currentValue in generatedValues)) {
                generatedValues[currentValue] = currentUnit;
                denyIndexes.push(index);
                return
            }

            $.each(values, function (idx, item) {
                if (denyIndexes.includes(idx)) {
                    return
                }

                var rating = stringSimilarity.compareTwoStrings(currentValue, item);
                if (rating >= minRating) {
                    denyIndexes.push(idx);
                    generatedValues[currentValue] += currentUnit;
                }
            });

        });

        $.each(generatedValues, function (index) {
            generatedValues[index] = rationalizeNumber(generatedValues[index]);
        });


        Object.keys(generatedValues).map(function (key, index) {
            if (typeof groceryData[index] === 'undefined') {
                groceryData[index] = ['', '', '', '']
            }

            groceryData[index][headKeyIndex] = generatedValues[key] + ' ' + key;
        });

        headKeyIndex += 1;
    });

    return {
        head: [Object.keys(groceryElements)],
        body: groceryData,
        tableWidth: 'auto',
        theme: "plain",
        rowPageBreak: 'avoid',
        columnStyles: {
            0: {
                cellWidth: 100,
            },
            1: {
                cellWidth: 100,
            },
            2: {
                cellWidth: 100,
            },
            3: {
                cellWidth: 100,
            }
        },
        styles: {
            cellPadding: 2,
            fontSize: 9,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            font: "times",
            minCellHeight: 10,
            overflow: 'linebreak',
        },
        headStyles: {
            cellPadding: 2,
            fillColor: [255, 255, 255],
            minCellHeight: 10,
        },
        margin: {top: 18, bottom: 18, left: 40, right: 25},
        didParseCell: function (table) {
            if (table.section === 'head') {
                table.cell.styles.textColor = '#000000';
            }
        },
    }
}


// CODE HERE
// -----------------------------------------
$(function() {
    // A few jQuery helpers for exporting only
    jQuery.fn.pop = [].pop;
    jQuery.fn.shift = [].shift;
    jQuery.fn.ignore = function(sel){
        return this.clone().find(sel||">*").remove().end();
    };

    var $table = $('#tableEditable');
    var $btn = $('[data-toggle="data-export"]');

    // DOM-ready auto-init of plugins.
    // Many plugins bind to an "enhance" event to init themselves on dom ready, or when new markup is inserted into the DOM
    // Use raw DOMContentLoaded instead of shoestring (may have issues in Android 2.3, exhibited by stack table)
    if (!("Tablesaw" in window)) {
        throw new Error("Tablesaw library not found.");
    }

    if (!("init" in Tablesaw)) {
        throw new Error("Your tablesaw-init.js is newer than the core Tablesaw version.");
    }

    Tablesaw.init();

    $('#tableEditable').on('click', 'input[name="rows-select"]', function(){
        var checkBoxes = $("input[name=\"row-select[]\"]");
        var currentChecbox = $(this);

        $('input[name="rows-select"]').each(function(i, e){
            if (!$(e).is(currentChecbox)){
                $(this).prop("checked", currentChecbox.prop("checked"));
            }
        });

        checkBoxes.each(function(e){
            $(this).prop("checked", currentChecbox.prop("checked"));
            $(this).trigger('change');
        });
    });

    $('#tableEditable').on('click', 'input[name="delete-confirm"]', function(){
        var checkBoxes = $('input[name="delete-confirm"]');
        var currentChecbox = $(this);

        checkBoxes.each(function(i, e){
            if (!$(e).is(currentChecbox)){
                $(this).prop("checked", currentChecbox.prop("checked"));
            }
        });
    });

    // Floating button
    var favInitilized = false;

    // Setup isScrolling variable
    var isScrolling;

    var $button = $('.table-button.fav');
    var $buttonDefault = $('.table-button.default');

    // Listen for scroll events
    window.addEventListener('scroll', function ( event ) {

        // Clear our timeout throughout the scroll
        window.clearTimeout( isScrolling );

        // Set a timeout to run after scrolling ends
        isScrolling = setTimeout(function() {
            scrollButtons();
        }, 50);

    }, false);

    // Show/hide generate button on varous steps
    $('#tableEditable').on('click', 'input[name=\"row-select[]\"]', function(){
        scrollButtonsEvent();
    });

    function scrollButtonsEvent(){
        var selectedCheckboxes = 0;

        $("input[name=\"row-select[]\"]").each(function () {
            if ($(this).is(':checked')){
                $(this).closest('tr').removeClass('is-disabled');
                selectedCheckboxes += 1;
            }
            else{
                $(this).closest('tr').addClass('is-disabled');
            }
        });

        scrollButtons(selectedCheckboxes);
    }

    function scrollButtons(selectedCheckboxes){
        if (selectedCheckboxes >= 5 || favInitilized){
            favInitilized = true;

            var anchorIsVisble = false;

            if($(window).scrollTop() + $(window).height() > $(document).height() - $button.height()) {
                anchorIsVisble = true;
            }

            if (anchorIsVisble){
                $button.addClass('is-hidden');
                $buttonDefault.removeClass('is-invisible');
            }
            else{
                $button.removeClass('is-hidden');
                $buttonDefault.addClass('is-invisible');
            }
        }
    }

    $('.actions-buttons').on('click', '.table-add', function(e) {
        e.preventDefault();

        var $clone = $table.find('tr.row-hidden').clone(true).removeClass('row-hidden').removeClass('js-service-row');
        $clone.addClass('is-moving');

        var $row = $(this).closest('tr');
        if ($row && $clone){
            $row.after($clone);
        }
        setTimeout(function() {
            $clone.removeClass('is-moving');
        }, 200);

        scrollButtonsEvent();
    });

    $('.actions-buttons').on('click', '.table-remove', function(e) {
        e.preventDefault();
        var $row = $(this).parents('tr');

        if ($('input[name="delete-confirm"]').not(":hidden").is(':checked')){
            if (confirm('Remove selected row?')) {

                $row.addClass('is-moving');
                setTimeout(function() {
                    $row.detach();
                }, 200);
            }
        }
        else{
            $row.addClass('is-moving');

            setTimeout(function() {
                $row.detach();
            }, 200);
        }

        scrollButtonsEvent();
    });

    // Arrows logic
    var $actionArrows = $('.actions-arrows');

    $actionArrows.on('click', '.table-up', function(e) {
        e.preventDefault();
        var $row = $(this).parents('tr');
        $row.addClass('is-moving');
        $row.prevAll().not(".is-hidden").first().before($row.get(0));

        setTimeout(function() {
            $row.removeClass('is-moving');
        }, 500);
    });

    $actionArrows.on('click', '.table-down', function(e) {
        e.preventDefault();
        var $row = $(this).parents('tr');
        $row.addClass('is-moving');
        $row.nextAll().not(".is-hidden").first().after($row.get(0));

        setTimeout(function() {
            $row.removeClass('is-moving');
        }, 500);
    });

    // Generate PDF
    $btn.click(function (e) {
        e.preventDefault();

        var pdfName = $('#tableEditable').data('pdfName');
        var clientName = $('input[name="client"]').val();
        var clientDate = $('#client-date').val();


        var clientNameTxt = $('label[for="client"]').text() + ' ' + clientName || '';
        var today = $('label[for="client-date"]').text() + ' ' + clientDate || '';
        var topOffset = 90;

        if (clientName && clientDate){
            pdfName = clientName + '_' + clientDate + '.pdf';
        }
        else if(clientName){
            pdfName = clientName + '_no_date_specified' + '.pdf';
        }
        else if(clientDate){
            pdfName = 'no_user_specified_' + clientDate + '.pdf';
        }

        if (!$('input[name="client"]').val()){
            alert('You need specify client name!')
            return
        }

        var $rows = $table.find('tr:not(.is-disabled):not(.js-service-row)');
        var headers = [];
        var body = [];
        var doc = new jsPDF('p','pt','a4');
        var skipIndexes = [0];

        // Get the headers (add special header logic here) for pdf
        $($rows.shift()).find('th:not(:empty)').each(function (i, el) {
            if (skipIndexes.indexOf(i) == -1){
                headers.push($(el).text());
            }
        });

        // Get rows for pdf
        $rows.each(function (el) {
            var $tds = $(this).find('td');
            var row = [];

            for (var i = 0; i < $tds.length; i++) {
                if (skipIndexes.indexOf(i) === -1){
                    row.push($($tds[i]).ignore('.tablesaw-cell-label').find('p').map(function(){
                            return $(this).text();
                        }).get().join('\n').trim());
                }
            }

            body.push(row);
        });

        // PDF additional data
        var imgData = 'data:image/png;base64,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';
        doc.addImage(imgData, 'PNG', 40, 15, 91.875, 38.625);
        doc.setFont('times');
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFontStyle('bold');
        doc.text(clientNameTxt, 140, 48);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1.0);
        doc.line(205, 52, 460, 52);

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.setFontStyle('bold');
        doc.text(today, 140, 70);

        var $legend = $('#legend');
        if ($legend.length){
            var legend  = $legend.html();
            doc.setFont('times');
            doc.setFontSize(9);
            doc.setTextColor(11);
            doc.fromHTML(legend, 35, 75);
            topOffset = topOffset + 15
        }

        var $legend2 = $('#legend2');
        if ($legend2.length){
            var legend2  = $legend2.html();
            doc.setFont('times');
            doc.setFontSize(9);
            doc.setTextColor(11);
            doc.fromHTML(legend2, 35, 90);
            topOffset = topOffset + 15
        }

        // JSPDF table to pdf
        doc.autoTable({
            head: [headers],
            body: body,
            startY: topOffset,
            tableWidth: 'auto',
            theme: "plain",
            columnStyles: {
                0: {
                    cellWidth: 75,
                    fontStyle: 'bold',
                },
                1: {
                    cellWidth: 40,
                },
                2: {
                    cellWidth: 40,
                },
                3: {
                    cellWidth: 40,
                },
                4: {
                    cellWidth: 90,
                },
                5: {
                    cellWidth: 65,
                },
                6: {
                    cellWidth: 90,
                },
                7: {
                    cellWidth: 90,
                },
            },
            // pageBreak: 'avoid',
            rowPageBreak: 'avoid',
            styles: {
                cellPadding: 2,
                fontSize: 9,
                lineColor: [0, 0, 0],
                lineWidth: 0.2,
                font: "times",
                minCellHeight: 40,
                overflow: 'linebreak',
            },
            headStyles: {
                cellPadding: 2,
                fillColor: [255, 255, 255],
                minCellHeight: 10,
            },
            margin: {top: 18, bottom: 18, left: 40, right: 25},
            willDrawCell: function(data) {
                // if (data.row.section === 'body' && data.column.dataKey == 0){
                //     doc.setFontStyle('bold');
                // }
            },
            didParseCell: function (table) {
                if (table.section === 'head') {
                    table.cell.styles.textColor = '#000000';
                }
            },
        });



        if ($table.find('tr:not(.is-disabled):not(:hidden)').length){
            var groceryData = generateGroceryTable($table);
            groceryData['startY'] = doc.lastAutoTable.finalY + 50;
            doc.autoTable(groceryData);
        }

        doc.save(pdfName);
    });

    $('[data-toggle="multiselect"] select').on('mousedown', function(e) {
        e.preventDefault();
        this.blur();
        window.focus();
    });

    // Search stuff
    $('[data-toggle="multiselect"] .select-overlay').click(function(e){
        var checkboxes = $(this).parent().next();
        var currentIndex = $(this).closest('[data-toggle="multiselect"]').index();

        if (checkboxes.hasClass('is-hidden')) {
            checkboxes.removeClass('is-hidden');
        } else {
            checkboxes.addClass('is-hidden');
        }

        $.each($('.dietary-checkboxes'), function (i, e) {
            if (currentIndex !== i){
                $(e).addClass('is-hidden');
            }
        })
    });

    // Hide menu on outside clicking
    $('body').on('click', function(e) {
        if($(e.target).closest('[data-toggle="multiselect"]').length == 0) {
            $('.dietary-checkboxes').addClass('is-hidden');
        }
    });

    // Filters
    LightTableFilter.init();

    // Add loaded state to table (without it table is disabled)
    $('.js-table').addClass('is-loaded');
});
