document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const tableContainer = document.getElementById('tableContainer');
    const csvTable = document.getElementById('csvTable');
    const deleteRowBtn = document.getElementById('deleteRowBtn');
    const deleteColumnBtn = document.getElementById('deleteColumnBtn');
    const newFileBtn = document.getElementById('newFileBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    let currentData = [];
    let selectedColumn = null;
    let selectedRow = null;
    let selectedCell = null;
    let isResizing = false;

    function showTable() {
        dropZone.style.display = 'none';
        tableContainer.style.display = 'flex';
        tableContainer.classList.add('visible');
        // Force reflow to ensure table renders correctly
        window.dispatchEvent(new Event('resize'));
    }

    function hideTable() {
        tableContainer.style.display = 'none';
        tableContainer.classList.remove('visible');
        dropZone.style.display = 'block';
    }

    // Initially hide the table container
    hideTable();

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        const file = files[0];
        if (file) {
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                parseCSV(file);
            } else {
                alert('Please upload a CSV file');
            }
        }
    }

    function parseCSV(file) {
        Papa.parse(file, {
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    currentData = results.data;
                    displayData(currentData);
                    showTable();
                    console.log('Table should be visible now');
                    // Force reflow and adjust columns
                    setTimeout(() => {
                        adjustColumnWidths();
                        window.dispatchEvent(new Event('resize'));
                    }, 100);
                } else {
                    alert('No data found in the CSV file');
                }
            },
            header: true,
            skipEmptyLines: true,
            error: function(error) {
                console.error('Error:', error);
                alert('Error parsing CSV file');
            }
        });
    }

    function displayData(data) {
        if (data.length === 0) return;
        
        console.log('Displaying data...');
        csvTable.innerHTML = '';

        const headers = Object.keys(data[0]);
        const headerRow = document.createElement('tr');
        
        // Add corner header
        const cornerHeader = document.createElement('th');
        cornerHeader.className = 'corner-header';
        headerRow.appendChild(cornerHeader);

        // Add column headers
        headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
            th.dataset.columnIndex = index;
            
            // Add resize handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            th.appendChild(resizeHandle);

            // Column selection
            th.addEventListener('click', (e) => {
                if (e.target === resizeHandle) return;
                selectColumn(index, headers[index]);
            });

            // Column resize
            resizeHandle.addEventListener('mousedown', initResize(th));

            headerRow.appendChild(th);
        });

        const thead = document.createElement('thead');
        thead.appendChild(headerRow);
        csvTable.appendChild(thead);

        const tbody = document.createElement('tbody');
        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            
            // Add row number
            const rowNumberCell = document.createElement('td');
            rowNumberCell.className = 'row-number';
            rowNumberCell.textContent = rowIndex + 1;
            rowNumberCell.addEventListener('click', () => selectRow(rowIndex));
            tr.appendChild(rowNumberCell);

            headers.forEach((header, colIndex) => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';
                td.setAttribute('contenteditable', 'true');
                td.dataset.rowIndex = rowIndex;
                td.dataset.columnIndex = colIndex;
                td.dataset.header = header;

                // Cell selection and editing
                td.addEventListener('click', (e) => handleCellClick(e, rowIndex, colIndex));
                td.addEventListener('focus', handleCellFocus);
                td.addEventListener('blur', handleCellEdit);
                td.addEventListener('keydown', handleCellKeydown);
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        csvTable.appendChild(tbody);
        console.log('Table populated');
    }

    function initResize(th) {
        return function(e) {
            isResizing = true;
            let startX = e.pageX;
            let startWidth = th.offsetWidth;

            function handleMouseMove(e) {
                if (isResizing) {
                    const width = startWidth + (e.pageX - startX);
                    if (width >= 50) { // Minimum width
                        th.style.width = `${width}px`;
                        const colIndex = th.dataset.columnIndex;
                        const cells = document.querySelectorAll(`td[data-column-index="${colIndex}"]`);
                        cells.forEach(cell => cell.style.width = `${width}px`);
                    }
                }
            }

            function handleMouseUp() {
                isResizing = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };
    }

    function adjustColumnWidths() {
        const headers = Array.from(csvTable.querySelectorAll('th:not(.corner-header)'));
        headers.forEach((header, index) => {
            const cells = Array.from(csvTable.querySelectorAll(`td[data-column-index="${index}"]`));
            const allElements = [header, ...cells];
            
            // Find the maximum content width
            const maxWidth = Math.max(...allElements.map(el => {
                const clone = el.cloneNode(true);
                clone.style.position = 'absolute';
                clone.style.visibility = 'hidden';
                clone.style.whiteSpace = 'nowrap';
                document.body.appendChild(clone);
                const width = clone.offsetWidth;
                document.body.removeChild(clone);
                return width;
            }));

            // Set the width (with some padding)
            const finalWidth = Math.min(Math.max(maxWidth + 20, 100), 300);
            header.style.width = `${finalWidth}px`;
            cells.forEach(cell => cell.style.width = `${finalWidth}px`);
        });
    }

    function selectColumn(index, header) {
        clearSelection();
        selectedColumn = index;
        
        const headerCell = document.querySelector(`th[data-column-index="${index}"]`);
        headerCell.classList.add('selected');
        
        const cells = document.querySelectorAll(`td[data-column-index="${index}"]`);
        cells.forEach(cell => cell.classList.add('column-selected'));
        
        deleteColumnBtn.disabled = false;
    }

    function selectRow(rowIndex) {
        clearSelection();
        selectedRow = rowIndex;
        
        const rowNumber = document.querySelector(`tr:nth-child(${rowIndex + 1}) .row-number`);
        rowNumber.classList.add('selected');
        
        const cells = document.querySelectorAll(`td[data-row-index="${rowIndex}"]`);
        cells.forEach(cell => cell.classList.add('row-selected'));
        
        deleteRowBtn.disabled = false;
    }

    function handleCellClick(e, rowIndex, colIndex) {
        if (!e.shiftKey) {
            clearSelection();
        }
        
        const cell = e.target;
        selectedCell = cell;
        cell.classList.add('selected');
    }

    function clearSelection() {
        selectedColumn = null;
        selectedRow = null;
        selectedCell = null;
        
        document.querySelectorAll('.selected, .column-selected, .row-selected').forEach(el => {
            el.classList.remove('selected', 'column-selected', 'row-selected');
        });
        
        deleteColumnBtn.disabled = true;
        deleteRowBtn.disabled = true;
    }

    // Delete functionality
    deleteColumnBtn.addEventListener('click', () => {
        if (selectedColumn !== null) {
            const header = Object.keys(currentData[0])[selectedColumn];
            currentData = currentData.map(row => {
                const newRow = {...row};
                delete newRow[header];
                return newRow;
            });
            displayData(currentData);
        }
    });

    deleteRowBtn.addEventListener('click', () => {
        if (selectedRow !== null) {
            currentData.splice(selectedRow, 1);
            displayData(currentData);
        }
    });

    // New file button
    newFileBtn.addEventListener('click', () => {
        hideTable();
        csvTable.innerHTML = '';
        currentData = [];
        clearSelection();
    });

    // Download functionality
    downloadBtn.addEventListener('click', () => {
        const csv = Papa.unparse(currentData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'exported_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Add window resize handler
    window.addEventListener('resize', () => {
        if (tableContainer.classList.contains('visible')) {
            adjustColumnWidths();
        }
    });

    // Initialize button states
    deleteRowBtn.disabled = true;
    deleteColumnBtn.disabled = true;

    function handleCellFocus(e) {
        const cell = e.target;
        cell.originalContent = cell.textContent;
    }

    function handleCellEdit(e) {
        const cell = e.target;
        const newValue = cell.textContent.trim();
        const rowIndex = parseInt(cell.dataset.rowIndex);
        const header = cell.dataset.header;

        if (newValue !== cell.originalContent) {
            currentData[rowIndex][header] = newValue;
            // Visual feedback for successful edit
            cell.style.backgroundColor = '#e6ffe6';
            setTimeout(() => {
                cell.style.backgroundColor = '';
            }, 500);
        }
    }

    function handleCellKeydown(e) {
        const cell = e.target;
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            cell.blur();
            // Move to the cell below
            const nextRow = cell.parentElement.nextElementSibling;
            if (nextRow) {
                const nextCell = nextRow.children[cell.cellIndex];
                nextCell.focus();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const currentRow = cell.parentElement;
            const currentIndex = Array.from(currentRow.children).indexOf(cell);
            
            if (e.shiftKey) {
                // Move to previous cell or previous row's last cell
                if (currentIndex > 1) { // > 1 because of row number cell
                    currentRow.children[currentIndex - 1].focus();
                } else if (currentRow.previousElementSibling) {
                    const prevRow = currentRow.previousElementSibling;
                    prevRow.lastElementChild.focus();
                }
            } else {
                // Move to next cell or next row's first cell
                if (currentIndex < currentRow.children.length - 1) {
                    currentRow.children[currentIndex + 1].focus();
                } else if (currentRow.nextElementSibling) {
                    const nextRow = currentRow.nextElementSibling;
                    nextRow.children[1].focus(); // Skip row number cell
                }
            }
        } else if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            navigateWithArrowKeys(e.key, cell);
        }
    }

    function navigateWithArrowKeys(key, cell) {
        const currentRow = cell.parentElement;
        const currentIndex = Array.from(currentRow.children).indexOf(cell);
        const rows = Array.from(csvTable.querySelectorAll('tr'));
        const currentRowIndex = rows.indexOf(currentRow);

        let nextCell;
        switch (key) {
            case 'ArrowUp':
                if (currentRowIndex > 1) { // > 1 to skip header row
                    nextCell = rows[currentRowIndex - 1].children[currentIndex];
                }
                break;
            case 'ArrowDown':
                if (currentRowIndex < rows.length - 1) {
                    nextCell = rows[currentRowIndex + 1].children[currentIndex];
                }
                break;
            case 'ArrowLeft':
                if (currentIndex > 1) { // > 1 to skip row number cell
                    nextCell = currentRow.children[currentIndex - 1];
                }
                break;
            case 'ArrowRight':
                if (currentIndex < currentRow.children.length - 1) {
                    nextCell = currentRow.children[currentIndex + 1];
                }
                break;
        }

        if (nextCell) {
            nextCell.focus();
            nextCell.classList.add('selected');
        }
    }
}); 