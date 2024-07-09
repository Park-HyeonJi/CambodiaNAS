from flask import Flask, render_template, redirect, url_for, request
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user

app = Flask(__name__)
app.secret_key = 'your_secret_key'

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
        return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in users and users[username]['password'] == password:
            user = User(username)
            login_user(user)
            return redirect(url_for('home'))
        
        # flash('Invalid username or password')
        return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/home')
@login_required
def home():
    return render_template('home.html')

@app.route('/m-group')
@login_required
def m_group():
    return render_template('m_group.html')

@app.route('/m-person')
@login_required
def m_person():
    return render_template('m_person.html')

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

# 로그아웃
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)
