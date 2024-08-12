from flask import Flask, render_template, redirect, url_for, request, jsonify, send_file
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import pandas as pd
import numpy as np
import os
import logging
from logging.handlers import RotatingFileHandler
from barchart import barchart
from radarchart import radarchart
from io import BytesIO


app = Flask(__name__)
app.secret_key = 'your_secret_key'

# 엑셀 파일 경로 설정
EXCEL_FILE_PATH = './data/group_user_data.xlsx'

# 로깅 설정
handler = RotatingFileHandler('error.log', maxBytes=10000, backupCount=1)
handler.setLevel(logging.ERROR)
app.logger.addHandler(handler)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

users = {'ddd': {'password': 'password'}}

class User(UserMixin):
    def __init__(self, id):
        self.id = id

    def get_id(self):
        return self.id

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

@app.route('/')
def base():
    if current_user.is_authenticated:
        return redirect(url_for('m_gandu'))  # 기본 페이지를 m_gandu로 변경
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in users and users[username]['password'] == password:
            user = User(username)
            login_user(user)
            return redirect(url_for('m_gandu'))  # 로그인 후 m_gandu로 리다이렉트

        return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/m-gandu')
@login_required
def m_gandu():
    return render_template('m_gandu.html')

@app.route('/get_groups', methods=['GET'])
@login_required
def get_groups():
    try:
        groups_df, _ = load_excel_data()

        # 설명 필드가 비어 있는 경우 빈 문자열로 대체
        groups_df['description'] = groups_df['description'].fillna('')

        groups = groups_df.to_dict(orient='records')
        return jsonify(groups)
    except Exception as e:
        app.logger.error(f"Error in get_groups: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/save_group', methods=['POST'])
@login_required
def save_group():
    try:
        data = request.get_json()
        group_name = data.get('name', '')
        group_desc = data.get('description', '')

        app.logger.info(f"Received group name: {group_name}, description: {group_desc}")

        groups_df, users_df = load_excel_data()

        if group_name in groups_df['name'].values:
            # 그룹 정보 업데이트
            groups_df.loc[groups_df['name'] == group_name, 'description'] = group_desc
            app.logger.info(f"Updated group description for {group_name}")
        else:
            app.logger.warning(f"Group {group_name} not found")
            return jsonify({'status': 'error', 'message': 'Group not found'}), 404

        save_excel_data(groups_df, users_df)
        app.logger.info(f"Group data saved successfully for {group_name}")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in save_group: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500



@app.route('/delete_group', methods=['POST'])
@login_required
def delete_group():
    try:
        data = request.get_json()
        group_name = data['name']

        # 엑셀에서 그룹과 사용자 데이터를 로드
        groups_df, users_df = load_excel_data()

        # 그룹 삭제
        groups_df = groups_df[groups_df['name'] != group_name]

        # 해당 그룹의 모든 사용자 데이터 삭제
        users_df = users_df[users_df['group'] != group_name]

        # 수정된 데이터를 다시 엑셀 파일에 저장
        save_excel_data(groups_df, users_df)

        app.logger.info(f"Group {group_name} and its users deleted successfully.")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in delete_group: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/get_users', methods=['GET'])
@login_required
def get_users():
    try:
        group_name = request.args.get('group')
        _, users_df = load_excel_data()
        
        users = users_df[users_df['group'] == group_name].to_dict(orient='records')
        return jsonify(users)
    except Exception as e:
        app.logger.error(f"Error in get_users: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/save_user', methods=['POST'])
@login_required
def save_user():
    try:
        data = request.get_json()
        groups_df, users_df = load_excel_data()

        user_id = str(data['id'])  # ID를 문자열로 변환
        user_group = data['group']

        # 그룹과 아이디를 함께 사용하여 사용자 식별
        existing_user = users_df[(users_df['id'].astype(str) == user_id) & (users_df['group'] == user_group)]

        if not existing_user.empty:
            # 기존 사용자의 정보 업데이트
            app.logger.info(f"Updating existing user with ID: {user_id} in group: {user_group}")
            users_df.loc[(users_df['id'].astype(str) == user_id) & (users_df['group'] == user_group),
                         ['name', 'gender', 'age', 'height', 'weight']] = \
                [data['name'], data['gender'], data['age'], data['height'], data['weight']]
        else:
            app.logger.info(f"Adding new user with ID: {user_id} in group: {user_group}")
            # 새 사용자 추가
            new_user = pd.DataFrame([data])
            users_df = pd.concat([users_df, new_user], ignore_index=True)

        save_excel_data(groups_df, users_df)
        app.logger.info(f"User data saved successfully for ID: {user_id} in group: {user_group}")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in save_user: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/delete_user', methods=['POST'])
@login_required
def delete_user():
    try:
        data = request.get_json()
        user_id = str(data['id'])  # ID를 문자열로 변환
        user_group = data['group']

        groups_df, users_df = load_excel_data()

        # 삭제 이전 데이터 상태를 로그로 확인
        app.logger.info(f"Before deletion, users: {users_df.to_dict(orient='records')}")

        # 그룹과 아이디를 함께 사용하여 사용자 삭제
        users_df = users_df[~((users_df['id'].astype(str) == user_id) & (users_df['group'] == user_group))]

        # 삭제 이후 데이터 상태를 로그로 확인
        app.logger.info(f"After deletion, users: {users_df.to_dict(orient='records')}")

        save_excel_data(groups_df, users_df)
        app.logger.info(f"User with ID: {user_id} from group: {user_group} deleted successfully.")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in delete_user: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/download_excel', methods=['GET'])
@login_required
def download_excel():
    group_name = request.args.get('group')
    
    # 데이터 로드
    _, users_df = load_excel_data()
    
    # 선택된 그룹의 사용자 데이터 필터링
    group_users = users_df[users_df['group'] == group_name]
    
    # 'group' 레이블 제외
    group_users = group_users.drop(columns=['group'])
    
    # 엑셀 파일로 변환
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        group_users.to_excel(writer, index=False)
    
    output.seek(0)
    
    # 엑셀 파일 전송
    return send_file(output, download_name=f'{group_name}_users.xlsx', as_attachment=True)


def load_excel_data():
    # 엑셀 파일에서 그룹과 사용자 데이터를 읽어옴
    xls = pd.ExcelFile(EXCEL_FILE_PATH)
    groups_df = pd.read_excel(xls, 'Group')
    users_df = pd.read_excel(xls, 'Users')

    app.logger.info(f"Loaded groups: {groups_df.to_dict(orient='records')}")
    app.logger.info(f"Loaded users: {users_df.to_dict(orient='records')}")

    return groups_df, users_df

def save_excel_data(groups_df, users_df):
    with pd.ExcelWriter(EXCEL_FILE_PATH, engine='openpyxl') as writer:
        groups_df.to_excel(writer, sheet_name='Group', index=False)
        users_df.to_excel(writer, sheet_name='Users', index=False)

@app.route('/24h')
@login_required
def tfh():
    return render_template('24h.html')

@app.route('/24h-stas')
@login_required
def tfh_stas():
    return render_template('24h_stas.html')

@app.route('/24h-excel')
@login_required
def tfh_excel():
    return render_template('24h_excel.html')

@app.route('/db-food')
@login_required
def db_food():
    return render_template('db_food.html')

@app.route('/db-nutri')
@login_required
def db_nutri():
    return render_template('db_nutri.html')

@app.route('/uchang') #########################  Uchang
@login_required
def uchang():
    return render_template('uchang.html')

@app.route('/search_food', methods=['POST'])
@login_required
def search_food():
    try:
        data = request.get_json()
        search_type = data['searchType']
        search_value = data['searchValue']
        
        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)
        
        if search_type == "code":
            results = food_data[food_data['Food Code'].astype(str).str.contains(search_value, na=False, case=False)]
        else:
            results = food_data[food_data['Food Name'].str.contains(search_value, na=False, case=False)]
        
        results = results.drop_duplicates(subset=['Food Code', 'Food Name', 'Ingredient Code'])
        results = results[['Food Code', 'Food Name', 'Ingredient Code']]
        
        return jsonify(results.to_dict(orient='records'))
    except Exception as e:
        app.logger.error(f"Error in search_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_food', methods=['POST'])
@login_required
def add_food():
    try:
        data = request.get_json()
        food_code = data['foodCode']
        food_name = data['foodName']
        time_category = data['timeCategory']
        user_group = data['userGroup']
        user_id = data['userID']
        view_date = data['viewDate']

        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)
        
        selected_food_data = food_data[food_data['Food Name'] == food_name]

        user_data = load_user_data(user_group, user_id, view_date)
        if time_category not in user_data:
            user_data[time_category] = []
        
        user_data[time_category].extend(selected_food_data.to_dict(orient='records'))
        save_user_data(user_group, user_id, view_date, user_data)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in add_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_food_list', methods=['GET'])
@login_required
def get_food_list():
    try:
        user_group = request.args.get('userGroup')
        user_id = request.args.get('userID')
        view_date = request.args.get('viewDate')

        user_data = load_user_data(user_group, user_id, view_date)
        return jsonify(user_data)
    except Exception as e:
        app.logger.error(f"Error in get_food_list: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def load_user_data(user_group, user_id, view_date):
    file_path = f'data/{user_group}_{user_id}_{view_date}.xlsx'
    if os.path.exists(file_path):
        xls = pd.ExcelFile(file_path)
        user_data = {sheet: xls.parse(sheet).to_dict(orient='records') for sheet in xls.sheet_names}
    else:
        user_data = {
            'Breakfast': [],
            'Morning snack': [],
            'Lunch': [],
            'Afternoon Snack': [],
            'Dinner': [],
            'Midnight Snack': []
        }
    return user_data

# 재료 코드
@app.route('/get_ingredients', methods=['POST'])
@login_required
def get_ingredients():
    try:
        data = request.get_json()
        food_codes = data['foodCode']

        if not isinstance(food_codes, list):
            food_codes = [food_codes]
        
        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)
        
        ingredient_codes = []
        for food_code in food_codes:
            ingredients = food_data[food_data['Food Code'] == int(food_code)]['Ingredient Code'].tolist()
            ingredient_codes.extend(ingredients)
        
        return jsonify(ingredient_codes)
    except Exception as e:
        app.logger.error(f"Error in get_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 영양 성분
@app.route('/get_nutrition', methods=['POST'])
@login_required
def get_nutrition():
    try:
        data = request.get_json()
        ingredient_codes = data['ingredientCodes']

        if isinstance(ingredient_codes, int):
            ingredient_codes = [ingredient_codes]
        elif not isinstance(ingredient_codes, list):
            ingredient_codes = list(ingredient_codes)
        
        nutrition_data_path = 'data/FoodIngredient_test.xlsx'
        nutrition_data = pd.read_excel(nutrition_data_path)
        
        nutrition_info = nutrition_data[nutrition_data['ID Code'].isin(ingredient_codes)]
        nutrition_info = nutrition_info.replace({np.nan: 0})
        nutrition_info = nutrition_info.to_dict(orient='records')
        
        return jsonify(nutrition_info)
    except Exception as e:
        app.logger.error(f"Error in get_nutrition: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def save_user_data(user_group, user_id, view_date, data):
    file_path = f'data/{user_group}_{user_id}_{view_date}.xlsx'
    with pd.ExcelWriter(file_path) as writer:
        for sheet_name, records in data.items():
            df = pd.DataFrame(records)
            df.to_excel(writer, sheet_name=sheet_name, index=False)

@app.route('/get_food_ingredients', methods=['GET'])
@login_required
def get_food_ingredients():
    try:
        food_code = request.args.get('foodCode')
        # 데이터 파일에서 음식 재료를 로드합니다.
        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)

        ingredients = food_data[food_data['Food Code'] == int(food_code)].to_dict(orient='records')
        return jsonify(ingredients)
    except Exception as e:
        app.logger.error(f"Error in get_food_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/FoodGroupIntake')
@login_required
def FoodGroupIntake():
    return render_template('test2.html')

@app.route('/runchart', methods=['POST'])
def run_python_code():
    current_meal_data = {
        'enerckcal': request.form.get('currentMealEnerckcal'),
        'enerckj': request.form.get('currentMealEnerckj'),
        'waterg': request.form.get('currentMealWaterg'),
        'protcntg': request.form.get('currentMealProtcntg'),
        'fatg': request.form.get('currentMealFatg'),
        'choavldfg': request.form.get('currentMealChoavldfg'),
        'fibtgg': request.form.get('currentMealFibtgg'),
        'ashg': request.form.get('currentMealAshg'),
        'camg': request.form.get('currentMealCamg'),
        'femg': request.form.get('currentMealFemg'),
        'znmg': request.form.get('currentMealZnmg'),
        'vitaraemcg': request.form.get('currentMealVitaraemcg'),
        'vitdmcg': request.form.get('currentMealVitdmcg'),
        'thiamg': request.form.get('currentMealThiamg'),
        'ribfmg': request.form.get('currentMealRibfmg'),
        'niamg': request.form.get('currentMealNiamg'),
        'pantacmg': request.form.get('currentMealPantacmg'),
        'vitb6mg': request.form.get('currentMealVitb6mg'),
        'folmcg': request.form.get('currentMealFolmcg'),
    }
    result = radarchart(current_meal_data) 
    result = barchart(current_meal_data) 
    return render_template('24h_chart.html', result=result)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
