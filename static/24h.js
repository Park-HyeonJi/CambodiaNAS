document.addEventListener('DOMContentLoaded', () => {
    loadGroupsForUser();
    toggleInputFields();
});

function loadGroupsForUser() {
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    const groupSelect = document.getElementById('userGroup');
    groupSelect.innerHTML = '';

    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        groupSelect.appendChild(option);
    });

    loadUsers(); // Load users for the first group by default
}

function loadUsers() {
    const selectedGroup = document.getElementById('userGroup').value;
    let users = JSON.parse(localStorage.getItem(selectedGroup + '_users')) || [];

    const userSelect = document.getElementById('userID');
    userSelect.innerHTML = '';

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });

    selectedUserId = null;
}

function toggleInputFields() {
    var codeInput = document.getElementById("codeInput");
    var nameInput = document.getElementById("nameInput");
    var searchType = document.querySelector('input[name="searchType"]:checked').value;

    if (searchType === "code") {
        codeInput.disabled = false;
        nameInput.disabled = true;
    } else {
        codeInput.disabled = true;
        nameInput.disabled = false;
    }
}

function searchFood() {
    var searchType = document.querySelector('input[name="searchType"]:checked').value;
    var searchValue = (searchType === "code") ? document.getElementById("codeInput").value : document.getElementById("nameInput").value;

    fetch('/search_food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ searchType: searchType, searchValue: searchValue })
    })
    .then(response => response.json())
    .then(data => {
        var tableBody = document.querySelector("#foodTable tbody");
        tableBody.innerHTML = "";

        var uniqueFoods = [];
        data.forEach(row => {
            if (!uniqueFoods.some(food => food['Food Name'] === row['Food Name'])) {
                uniqueFoods.push(row);
                var tr = document.createElement("tr");
                tr.innerHTML = `<td>${row['Food Code']}</td><td>${row['Food Name']}</td>`;
                tr.onclick = function() {
                    tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
                    tr.style.backgroundColor = 'lightgray';
                    tr.dataset.selected = true;
                };
                tableBody.appendChild(tr);
            }
        });
    });
}

function setActive(button) {
    document.querySelectorAll('.time-categories button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    loadFoodList(); // 버튼이 눌릴 때마다 음식 리스트를 로드
}

function addToFoodList() {
    var selectedRow = document.querySelector("#foodTable tbody tr[data-selected='true']");
    if (!selectedRow) return alert("Please select a food item to add");

    var foodCode = selectedRow.cells[0].textContent;
    var foodName = selectedRow.cells[1].textContent;
    var timeCategory = document.querySelector('.time-categories button.active').dataset.category;
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;

    fetch('/add_food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            foodCode: foodCode,
            foodName: foodName,
            timeCategory: timeCategory,
            userGroup: userGroup,
            userID: userID,
            viewDate: viewDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            loadFoodList();
        } else {
            alert("Error adding food: " + data.message);
        }
    });
}

// 두 번째 컨테이너
function loadFoodList() {
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;
    var activeCategory = document.querySelector('.time-categories button.active').dataset.category;

    fetch(`/get_food_list?userGroup=${userGroup}&userID=${userID}&viewDate=${viewDate}`)
    .then(response => response.json())
    .then(data => {
        document.querySelectorAll('.food-items tbody').forEach(tbody => tbody.innerHTML = ""); // 기존 데이터를 초기화

        var tableBody = document.querySelector(`.food-items tbody[data-category='${activeCategory}']`);
        var uniqueFoods = [];

        data[activeCategory].forEach(food => {
            if (!uniqueFoods.some(item => item['Food Name'] === food['Food Name'])) {
                uniqueFoods.push(food);
                var tr = document.createElement("tr");
                tr.innerHTML = `<td>${food['Food Code']}</td><td>${food['Food Name']}</td>`;
                tr.onclick = function() {
                    tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
                    tr.style.backgroundColor = 'lightgray';
                    console.log('Loading nutrition for Food Code:', food['Food Code']);
                    loadNutrition(food['Food Code']); // 셀을 클릭하면 loadNutrition 함수 호출
                    loadIngredients(food); // 행을 클릭할 때 재료 로드
                };
                tableBody.appendChild(tr);
            }
        });
        calculateCurrentMeal()
        calculateDailyTotal()
    });
}


// 영양 성분 테이블 - Current Food
function loadNutrition(foodCode) {
    fetch('/get_ingredients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ foodCode: foodCode })
    })
    .then(response => response.json())
    .then(ingredientCodes => {
        console.log('Received ingredient codes:', ingredientCodes);
        fetch('/get_nutrition', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredientCodes: ingredientCodes })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Received nutrition data:', data);
            if (data.length > 0) {
                var nutrientTotals = {
                    'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
                    'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
                    'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
                    'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
                };

                data.forEach(nutrient => {
                    for (var key in nutrientTotals) {
                        if (nutrient.hasOwnProperty(key)) {
                            nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
                        }
                    }
                });

                console.log('Nutrient Totals:', nutrientTotals);

                for (var key in nutrientTotals) {
                    if (nutrientTotals.hasOwnProperty(key)) {
                        var elementId = `current-food-${key.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
                        var element = document.getElementById(elementId);
                        if (element) {
                            element.textContent = nutrientTotals[key].toFixed(2);
                            // console.log(`Updated ${elementId} with value: ${nutrientTotals[key].toFixed(2)}`);
                        } else {
                            console.error(`Element with ID ${elementId} not found`);
                        }
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error fetching nutrition data:', error);
        });
    })
    .catch(error => {
        console.error('Error fetching ingredient codes:', error);
    });
}

// 영양성분 테이블 - Current Meal
function calculateCurrentMeal() {
    var activeCategory = document.querySelector('.time-categories button.active').dataset.category;
    var tableBody = document.querySelector(`.food-items tbody[data-category='${activeCategory}']`);

    var foodCodes = [];
    tableBody.querySelectorAll('tr').forEach(tr => {
        var foodCode = tr.cells[0].textContent;
        foodCodes.push(foodCode);
    });

    console.log("current meal foodCodes: ", foodCodes)

    fetch('/get_ingredients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ foodCode: foodCodes })
    })
    .then(response => response.json())
    .then(ingredientCodes => {
        console.log('영양 성분 테이블:', ingredientCodes);
        fetch('/get_nutrition', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredientCodes: ingredientCodes })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Received nutrition data:', data);
            if (data.length > 0) {
                var nutrientTotals = {
                    'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
                    'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
                    'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
                    'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
                };

                data.forEach(nutrient => {
                    for (var key in nutrientTotals) {
                        if (nutrient.hasOwnProperty(key)) {
                            nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
                        }
                    }
                });

                for (var key in nutrientTotals) {
                    var elementId = `current-meal-${key.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
                    var element = document.getElementById(elementId);
                    if (element) {
                        element.textContent = nutrientTotals[key].toFixed(2);
                    } else {
                        console.error(`Element with ID ${elementId} not found`);
                    }
                }
            }
        });
    });
}

// 영양성분 테이블 - Daily Total
function calculateDailyTotal() {
    var categories = ['Breakfast', 'Morning snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Midnight Snack'];
    var foodCodes = [];

    categories.forEach(category => {
        var tableBody = document.querySelector(`.food-items tbody[data-category='${category}']`);
        if (tableBody) {
            var rows = tableBody.querySelectorAll('tr');
            rows.forEach(tr => {
                var foodCode = tr.cells[0].textContent.trim(); // trim() 함수를 사용하여 공백 제거
                foodCodes.push(foodCode);
                console.log(`Category: ${category}, Food Code: ${foodCode}`);
            });
        }
    });

    console.log("데일리 토탈 foodCodes: ", foodCodes);

    fetch('/get_ingredients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ foodCode: foodCodes })
    })
    .then(response => response.json())
    .then(ingredientCodes => {
        console.log('Received ingredient codes:', ingredientCodes);
        return fetch('/get_nutrition', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredientCodes: ingredientCodes })
        });
    })
    .then(response => response.json())
    .then(data => {
        console.log('Received nutrition data:', data);
        if (data.length > 0) {
            var nutrientTotals = {
                'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
                'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
                'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
                'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
            };

            data.forEach(nutrient => {
                for (var key in nutrientTotals) {
                    if (nutrient.hasOwnProperty(key)) {
                        nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
                    }
                }
            });

            for (var key in nutrientTotals) {
                var elementId = `daily-total-${key.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
                var element = document.getElementById(elementId);
                if (element) {
                    element.textContent = nutrientTotals[key].toFixed(2);
                } else {
                    console.error(`Element with ID ${elementId} not found`);
                }
            }
        }
    })
    .catch(error => {
        console.error("Error fetching nutrition data: ", error);
    });
}



function calculateDailyTotal() {
    var categories = ['Breakfast', 'Morning snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Midnight Snack'];
    var foodCodes = [];

    categories.forEach(category => {
        var tableBody = document.querySelector(`.food-items tbody[data-category='${category}']`);
        console.log(`Category: ${category}, TableBody: `, tableBody);
        if (tableBody) {
            var rows = tableBody.querySelectorAll('tr');
            console.log(`Category: ${category}, Rows: `, rows);
            rows.forEach(tr => {
                var foodCode = tr.cells[0].textContent.trim(); // trim() 함수를 사용하여 공백 제거
                foodCodes.push(foodCode);

                console.log(`Category: ${category}, Food Code: ${foodCode}`);
            });
        }
        if (tableBody){
            tableBody.querySelectorAll('tr').forEach(tr => {
                var foodCode = tr.cells[0].textContent.trim();
                foodCodes.push(foodCode);
            });
        }
    });

    console.log("데일리 토탈 foodCodes: ", foodCodes)

    fetch('/get_ingredients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ foodCode: foodCodes })
    })
    .then(response => response.json())
    .then(ingredientCodes => {
        fetch('/get_nutrition', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredientCodes: ingredientCodes })
        })
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                var nutrientTotals = {
                    'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
                    'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
                    'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
                    'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
                };

                data.forEach(nutrient => {
                    for (var key in nutrientTotals) {
                        if (nutrient.hasOwnProperty(key)) {
                            nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
                        }
                    }
                });

                for (var key in nutrientTotals) {
                    var elementId = `daily-total-${key.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
                    var element = document.getElementById(elementId);
                    if (element) {
                        element.textContent = nutrientTotals[key].toFixed(2);
                    }
                }
            }
        });
    });
}

function loadIngredients(food) {
    // ingredientTableBody를 초기화합니다.
    var ingredientTableBody = document.getElementById('ingredientTableBody');
    ingredientTableBody.innerHTML = "";

    // 음식의 재료 정보를 가져옵니다.
    fetch(`/get_food_ingredients?foodCode=${food['Food Code']}`)
    .then(response => response.json())
    .then(data => {
        data.forEach(ingredient => {
            var tr = document.createElement("tr");
            tr.innerHTML = `<td>${ingredient['Ingredient Code']}</td><td>${ingredient['Ingrdient']}</td><td>${ingredient['1 person (g)']}</td>`;
            ingredientTableBody.appendChild(tr);
        });
    });
}

function loadData() {
    loadFoodList();
}

function copyData() {
    // Copy data functionality
}

function submitChartForm() {
        // Current Meal 행의 값을 가져오기
        document.getElementById('currentMealEnerckcal').value = document.getElementById('current-meal-enerckcal').innerText;
        document.getElementById('currentMealEnerckj').value = document.getElementById('current-meal-enerckj').innerText;
        document.getElementById('currentMealWaterg').value = document.getElementById('current-meal-waterg').innerText;
        document.getElementById('currentMealProtcntg').value = document.getElementById('current-meal-protcntg').innerText;
        document.getElementById('currentMealFatg').value = document.getElementById('current-meal-fatg').innerText;
        document.getElementById('currentMealChoavldfg').value = document.getElementById('current-meal-choavldfg').innerText;
        document.getElementById('currentMealFibtgg').value = document.getElementById('current-meal-fibtgg').innerText;
        document.getElementById('currentMealAshg').value = document.getElementById('current-meal-ashg').innerText;
        document.getElementById('currentMealCamg').value = document.getElementById('current-meal-camg').innerText;
        document.getElementById('currentMealFemg').value = document.getElementById('current-meal-femg').innerText;
        document.getElementById('currentMealZnmg').value = document.getElementById('current-meal-znmg').innerText;
        document.getElementById('currentMealVitaraemcg').value = document.getElementById('current-meal-vitaraemcg').innerText;
        document.getElementById('currentMealVitdmcg').value = document.getElementById('current-meal-vitdmcg').innerText;
        document.getElementById('currentMealThiamg').value = document.getElementById('current-meal-thiamg').innerText;
        document.getElementById('currentMealRibfmg').value = document.getElementById('current-meal-ribfmg').innerText;
        document.getElementById('currentMealNiamg').value = document.getElementById('current-meal-niamg').innerText;
        document.getElementById('currentMealPantacmg').value = document.getElementById('current-meal-pantacmg').innerText;
        document.getElementById('currentMealVitb6mg').value = document.getElementById('current-meal-vitb6mg').innerText;
        document.getElementById('currentMealFolmcg').value = document.getElementById('current-meal-folmcg').innerText;
        // 폼 제출
        document.getElementById('chartForm').submit();
}



