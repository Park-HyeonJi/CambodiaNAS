document.addEventListener('DOMContentLoaded', () => {
    toggleInputFields();
});

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

                    // 클릭한 음식의 재료를 로드
                    loadIngredients(row['Food Code']);
                };
                tableBody.appendChild(tr);
            }
        });
    });
}

function loadIngredients(foodCode) {
    var ingredientTableBody = document.getElementById('ingredientTableBody');
    ingredientTableBody.innerHTML = ""; // 기존 재료 데이터 초기화

    fetch(`/get_food_ingredients?foodCode=${foodCode}`)
    .then(response => response.json())
    .then(data => {
        data.forEach(ingredient => {
            var tr = document.createElement("tr");
            tr.innerHTML = `<td>${ingredient['Ingredient Code']}</td><td>${ingredient['Ingrdient']}</td><td>${ingredient['1 person (g)']}</td>`;
            ingredientTableBody.appendChild(tr);
        });
    });
}
