from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = 'homerentpro-secret-key-2026'

# ─── Data File Paths ────────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
FILES = {
    'users': os.path.join(DATA_DIR, 'users.json'),
    'rooms': os.path.join(DATA_DIR, 'rooms.json'),
    'bookings': os.path.join(DATA_DIR, 'bookings.json'),
    'reviews': os.path.join(DATA_DIR, 'reviews.json'),
    'messages': os.path.join(DATA_DIR, 'messages.json'),
    'favorites': os.path.join(DATA_DIR, 'favorites.json'),
    'contacts': os.path.join(DATA_DIR, 'contacts.json'),
}

# In-memory token store: { token: userId }
active_tokens = {}

# ─── JSON Helpers ────────────────────────────────────────────────────────────

def _ensure_files():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    for path in FILES.values():
        if not os.path.exists(path):
            with open(path, 'w') as f:
                json.dump([], f)

_ensure_files()

def load_data(key):
    try:
        with open(FILES[key], 'r') as f:
            return json.load(f)
    except Exception:
        return []

def save_data(key, data):
    with open(FILES[key], 'w') as f:
        json.dump(data, f, indent=2)

# ─── Auth Helpers ────────────────────────────────────────────────────────────

def get_current_user():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token or token not in active_tokens:
        return None
    user_id = active_tokens[token]
    users = load_data('users')
    user = next((u for u in users if u['id'] == user_id), None)
    return user

def require_auth():
    user = get_current_user()
    if not user:
        return None
    return user

# ═══════════════════════════════════════════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'HomeRent Pro API is running!'}), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200

# ═══════════════════════════════════════════════════════════════════════════════
#  AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['name', 'email', 'password', 'role']
    if not all(field in data for field in required):
        return jsonify({'error': 'Missing required fields: name, email, password, role'}), 400

    if data['role'] not in ['owner', 'tenant']:
        return jsonify({'error': 'Role must be owner or tenant'}), 400

    users = load_data('users')

    # Check duplicate email
    if any(u['email'].lower() == data['email'].lower() for u in users):
        return jsonify({'error': 'Email already registered'}), 409

    new_user = {
        'id': str(uuid.uuid4()),
        'name': data['name'],
        'email': data['email'].lower(),
        'phone': data.get('phone', ''),
        'password': generate_password_hash(data['password']),
        'role': data['role'],
        'avatar': data.get('avatar', ''),
        'bio': data.get('bio', ''),
        'createdAt': datetime.now().isoformat()
    }

    users.append(new_user)
    save_data('users', users)

    # Auto-login
    token = str(uuid.uuid4())
    active_tokens[token] = new_user['id']

    safe_user = {k: v for k, v in new_user.items() if k != 'password'}
    return jsonify({'user': safe_user, 'token': token}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Email and password required'}), 400

    users = load_data('users')
    user = next((u for u in users if u['email'].lower() == data['email'].lower()), None)

    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = str(uuid.uuid4())
    active_tokens[token] = user['id']

    safe_user = {k: v for k, v in user.items() if k != 'password'}
    return jsonify({'user': safe_user, 'token': token}), 200


@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    """Handle Google OAuth: verify token, login or auto-register."""
    data = request.get_json()
    credential = data.get('credential')
    if not credential:
        return jsonify({'error': 'Google credential is required'}), 400

    # Verify the Google credential (could be an ID token or an access token)
    try:
        import requests as http_requests
        google_user = None

        # Try 1: Verify as an ID token via tokeninfo
        resp = http_requests.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'id_token': credential},
            timeout=10
        )
        if resp.status_code == 200:
            google_user = resp.json()

        # Try 2: If ID token failed, treat it as an access token
        if not google_user:
            resp = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {credential}'},
                timeout=10
            )
            if resp.status_code == 200:
                google_user = resp.json()

        if not google_user:
            return jsonify({'error': 'Invalid Google token'}), 401
    except Exception:
        return jsonify({'error': 'Failed to verify Google token'}), 500

    email = google_user.get('email', '').lower()
    name = google_user.get('name', google_user.get('given_name', 'Google User'))
    avatar = google_user.get('picture', '')

    if not email:
        return jsonify({'error': 'Could not retrieve email from Google'}), 400

    users = load_data('users')
    user = next((u for u in users if u['email'].lower() == email), None)

    if user:
        # Existing user — verify role matches
        selected_role = data.get('role', '')
        if selected_role and user['role'] != selected_role:
            role_label = 'Property Owner' if user['role'] == 'owner' else 'Tenant'
            return jsonify({
                'error': f'This account is registered as "{role_label}". Please select the correct role and try again.'
            }), 403

        # Role matched — log them in
        token = str(uuid.uuid4())
        active_tokens[token] = user['id']
        safe_user = {k: v for k, v in user.items() if k != 'password'}
        return jsonify({'user': safe_user, 'token': token}), 200
    else:
        # New user — auto-register
        role = data.get('role', 'tenant')
        if role not in ['owner', 'tenant']:
            role = 'tenant'

        new_user = {
            'id': str(uuid.uuid4()),
            'name': name,
            'email': email,
            'phone': '',
            'password': generate_password_hash(str(uuid.uuid4())),  # random placeholder
            'role': role,
            'avatar': avatar,
            'bio': '',
            'authProvider': 'google',
            'createdAt': datetime.now().isoformat()
        }

        users.append(new_user)
        save_data('users', users)

        token = str(uuid.uuid4())
        active_tokens[token] = new_user['id']
        safe_user = {k: v for k, v in new_user.items() if k != 'password'}
        return jsonify({'user': safe_user, 'token': token, 'isNewUser': True}), 201


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token in active_tokens:
        del active_tokens[token]
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    safe_user = {k: v for k, v in user.items() if k != 'password'}
    return jsonify(safe_user), 200


@app.route('/api/auth/update', methods=['PUT'])
def update_profile():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    users = load_data('users')
    idx = next((i for i, u in enumerate(users) if u['id'] == user['id']), None)
    if idx is None:
        return jsonify({'error': 'User not found'}), 404

    users[idx]['name'] = data.get('name', users[idx]['name'])
    users[idx]['phone'] = data.get('phone', users[idx]['phone'])
    users[idx]['bio'] = data.get('bio', users[idx].get('bio', ''))
    users[idx]['avatar'] = data.get('avatar', users[idx].get('avatar', ''))

    if 'newPassword' in data and data['newPassword']:
        if 'currentPassword' not in data or not check_password_hash(users[idx]['password'], data['currentPassword']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        users[idx]['password'] = generate_password_hash(data['newPassword'])

    save_data('users', users)
    safe_user = {k: v for k, v in users[idx].items() if k != 'password'}
    return jsonify(safe_user), 200


# ─── Password Reset ─────────────────────────────────────────────────────────

# In-memory reset token store: { token: { userId, expiresAt } }
reset_tokens = {}

@app.route('/api/auth/forgot-password/verify', methods=['POST'])
def forgot_password_verify():
    """Step 1: Verify identity via email + phone number."""
    data = request.get_json()
    if not data or 'email' not in data or 'phone' not in data:
        return jsonify({'error': 'Email and phone number are required'}), 400

    users = load_data('users')
    user = next((u for u in users if u['email'].lower() == data['email'].lower()), None)

    if not user:
        return jsonify({'error': 'No account found with this email address'}), 404

    # Verify that the phone number matches
    if user.get('phone', '') != data['phone']:
        return jsonify({'error': 'Phone number does not match our records'}), 400

    # Generate a temporary reset token (expires in 15 minutes)
    reset_token = str(uuid.uuid4())
    from datetime import timedelta
    reset_tokens[reset_token] = {
        'userId': user['id'],
        'expiresAt': (datetime.now() + timedelta(minutes=15)).isoformat()
    }

    return jsonify({
        'message': 'Identity verified successfully',
        'resetToken': reset_token,
        'userName': user['name']
    }), 200


@app.route('/api/auth/forgot-password/reset', methods=['POST'])
def forgot_password_reset():
    """Step 2: Reset password using the temporary reset token."""
    data = request.get_json()
    if not data or 'resetToken' not in data or 'newPassword' not in data:
        return jsonify({'error': 'Reset token and new password are required'}), 400

    token = data['resetToken']
    if token not in reset_tokens:
        return jsonify({'error': 'Invalid or expired reset token. Please start over.'}), 400

    token_data = reset_tokens[token]
    if datetime.now().isoformat() > token_data['expiresAt']:
        del reset_tokens[token]
        return jsonify({'error': 'Reset token has expired. Please start over.'}), 400

    if len(data['newPassword']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    users = load_data('users')
    idx = next((i for i, u in enumerate(users) if u['id'] == token_data['userId']), None)
    if idx is None:
        del reset_tokens[token]
        return jsonify({'error': 'User not found'}), 404

    users[idx]['password'] = generate_password_hash(data['newPassword'])
    save_data('users', users)

    # Clean up the used token
    del reset_tokens[token]

    return jsonify({'message': 'Password has been reset successfully! You can now log in.'}), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  ROOMS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms = load_data('rooms')
    # Add average rating to each room
    reviews = load_data('reviews')
    for room in rooms:
        room_reviews = [r for r in reviews if r['roomId'] == room['id']]
        room['avgRating'] = round(sum(r['rating'] for r in room_reviews) / len(room_reviews), 1) if room_reviews else 0
        room['reviewCount'] = len(room_reviews)
    return jsonify(rooms), 200


@app.route('/api/rooms/featured', methods=['GET'])
def get_featured_rooms():
    rooms = load_data('rooms')
    reviews = load_data('reviews')
    featured = [r for r in rooms if r.get('featured', False)]
    for room in featured:
        room_reviews = [rv for rv in reviews if rv['roomId'] == room['id']]
        room['avgRating'] = round(sum(rv['rating'] for rv in room_reviews) / len(room_reviews), 1) if room_reviews else 0
        room['reviewCount'] = len(room_reviews)
    return jsonify(featured), 200


@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    rooms = load_data('rooms')
    room = next((r for r in rooms if r['id'] == room_id), None)
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    # Increment views
    idx = next(i for i, r in enumerate(rooms) if r['id'] == room_id)
    rooms[idx]['views'] = rooms[idx].get('views', 0) + 1
    save_data('rooms', rooms)

    # Add reviews
    reviews = load_data('reviews')
    room_reviews = [r for r in reviews if r['roomId'] == room_id]
    room['avgRating'] = round(sum(r['rating'] for r in room_reviews) / len(room_reviews), 1) if room_reviews else 0
    room['reviewCount'] = len(room_reviews)
    room['views'] = rooms[idx]['views']

    return jsonify(room), 200


@app.route('/api/rooms', methods=['POST'])
def add_room():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    if user['role'] != 'owner':
        return jsonify({'error': 'Only owners can add rooms'}), 403

    data = request.get_json()
    required_fields = ['name', 'price', 'location', 'bhk', 'area', 'description']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    rooms = load_data('rooms')

    new_room = {
        'id': str(uuid.uuid4()),
        'name': data['name'],
        'price': float(data['price']),
        'location': data['location'],
        'bhk': int(data['bhk']),
        'area': float(data['area']),
        'description': data['description'],
        'amenities': data.get('amenities', []),
        'furnishing': data.get('furnishing', 'unfurnished'),
        'image': data.get('image', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'),
        'images': data.get('images', []),
        'contact': data.get('contact', user.get('phone', '')),
        'email': data.get('email', user['email']),
        'ownerId': user['id'],
        'ownerName': user['name'],
        'createdAt': datetime.now().isoformat(),
        'views': 0,
        'featured': False
    }

    if not new_room['images'] and new_room['image']:
        new_room['images'] = [new_room['image']]

    rooms.append(new_room)
    save_data('rooms', rooms)
    return jsonify(new_room), 201


@app.route('/api/rooms/<room_id>', methods=['PUT'])
def update_room(room_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    rooms = load_data('rooms')
    idx = next((i for i, r in enumerate(rooms) if r['id'] == room_id), None)
    if idx is None:
        return jsonify({'error': 'Room not found'}), 404

    if rooms[idx]['ownerId'] != user['id']:
        return jsonify({'error': 'You can only edit your own rooms'}), 403

    data = request.get_json()
    room = rooms[idx]
    room.update({
        'name': data.get('name', room['name']),
        'price': float(data.get('price', room['price'])),
        'location': data.get('location', room['location']),
        'bhk': int(data.get('bhk', room['bhk'])),
        'area': float(data.get('area', room['area'])),
        'description': data.get('description', room['description']),
        'amenities': data.get('amenities', room.get('amenities', [])),
        'furnishing': data.get('furnishing', room.get('furnishing', 'unfurnished')),
        'image': data.get('image', room.get('image', '')),
        'images': data.get('images', room.get('images', [])),
        'contact': data.get('contact', room.get('contact', '')),
        'email': data.get('email', room.get('email', '')),
    })

    save_data('rooms', rooms)
    return jsonify(room), 200


@app.route('/api/rooms/<room_id>', methods=['DELETE'])
def delete_room(room_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    rooms = load_data('rooms')
    room = next((r for r in rooms if r['id'] == room_id), None)
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    if room['ownerId'] != user['id']:
        return jsonify({'error': 'You can only delete your own rooms'}), 403

    rooms = [r for r in rooms if r['id'] != room_id]
    save_data('rooms', rooms)

    # Clean up related data
    bookings = load_data('bookings')
    bookings = [b for b in bookings if b['roomId'] != room_id]
    save_data('bookings', bookings)

    reviews = load_data('reviews')
    reviews = [r for r in reviews if r['roomId'] != room_id]
    save_data('reviews', reviews)

    favorites = load_data('favorites')
    favorites = [f for f in favorites if f['roomId'] != room_id]
    save_data('favorites', favorites)

    return jsonify({'message': 'Room deleted successfully'}), 200


@app.route('/api/rooms/user/<user_id>', methods=['GET'])
def get_user_rooms(user_id):
    rooms = load_data('rooms')
    user_rooms = [r for r in rooms if r['ownerId'] == user_id]
    reviews = load_data('reviews')
    for room in user_rooms:
        room_reviews = [rv for rv in reviews if rv['roomId'] == room['id']]
        room['avgRating'] = round(sum(rv['rating'] for rv in room_reviews) / len(room_reviews), 1) if room_reviews else 0
        room['reviewCount'] = len(room_reviews)
    return jsonify(user_rooms), 200


@app.route('/api/search', methods=['GET'])
def search_rooms():
    location = request.args.get('location', '').lower()
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    bhk = request.args.get('bhk', type=int)
    furnishing = request.args.get('furnishing', '').lower()
    sort_by = request.args.get('sort', 'newest')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)

    rooms = load_data('rooms')
    reviews = load_data('reviews')

    # Add ratings
    for room in rooms:
        room_reviews = [r for r in reviews if r['roomId'] == room['id']]
        room['avgRating'] = round(sum(r['rating'] for r in room_reviews) / len(room_reviews), 1) if room_reviews else 0
        room['reviewCount'] = len(room_reviews)

    # Apply filters
    if location:
        rooms = [r for r in rooms if location in r['location'].lower()]
    if min_price is not None:
        rooms = [r for r in rooms if r['price'] >= min_price]
    if max_price is not None:
        rooms = [r for r in rooms if r['price'] <= max_price]
    if bhk is not None:
        rooms = [r for r in rooms if r['bhk'] == bhk]
    if furnishing:
        rooms = [r for r in rooms if r.get('furnishing', '').lower() == furnishing]

    # Sort
    if sort_by == 'price_low':
        rooms.sort(key=lambda r: r['price'])
    elif sort_by == 'price_high':
        rooms.sort(key=lambda r: r['price'], reverse=True)
    elif sort_by == 'rating':
        rooms.sort(key=lambda r: r.get('avgRating', 0), reverse=True)
    elif sort_by == 'popular':
        rooms.sort(key=lambda r: r.get('views', 0), reverse=True)
    else:  # newest
        rooms.sort(key=lambda r: r.get('createdAt', ''), reverse=True)

    total = len(rooms)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = rooms[start:end]

    return jsonify({
        'rooms': paginated,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }), 200

# ═══════════════════════════════════════════════════════════════════════════════
#  BOOKINGS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data or 'roomId' not in data:
        return jsonify({'error': 'Room ID required'}), 400

    rooms = load_data('rooms')
    room = next((r for r in rooms if r['id'] == data['roomId']), None)
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    bookings = load_data('bookings')

    new_booking = {
        'id': str(uuid.uuid4()),
        'roomId': data['roomId'],
        'roomName': room['name'],
        'roomImage': room.get('image', ''),
        'roomPrice': room['price'],
        'tenantId': user['id'],
        'tenantName': user['name'],
        'tenantEmail': user['email'],
        'tenantPhone': user.get('phone', ''),
        'ownerId': room['ownerId'],
        'ownerName': room.get('ownerName', ''),
        'moveInDate': data.get('moveInDate', ''),
        'duration': data.get('duration', ''),
        'message': data.get('message', ''),
        'status': 'pending',
        'createdAt': datetime.now().isoformat()
    }

    bookings.append(new_booking)
    save_data('bookings', bookings)
    return jsonify(new_booking), 201


@app.route('/api/bookings/tenant', methods=['GET'])
def get_tenant_bookings():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    bookings = load_data('bookings')
    user_bookings = [b for b in bookings if b['tenantId'] == user['id']]
    user_bookings.sort(key=lambda b: b['createdAt'], reverse=True)
    return jsonify(user_bookings), 200


@app.route('/api/bookings/owner', methods=['GET'])
def get_owner_bookings():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    bookings = load_data('bookings')
    owner_bookings = [b for b in bookings if b['ownerId'] == user['id']]
    owner_bookings.sort(key=lambda b: b['createdAt'], reverse=True)
    return jsonify(owner_bookings), 200


@app.route('/api/bookings/<booking_id>/status', methods=['PUT'])
def update_booking_status(booking_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if 'status' not in data:
        return jsonify({'error': 'Status required'}), 400

    if data['status'] not in ['approved', 'rejected', 'cancelled']:
        return jsonify({'error': 'Invalid status'}), 400

    bookings = load_data('bookings')
    idx = next((i for i, b in enumerate(bookings) if b['id'] == booking_id), None)
    if idx is None:
        return jsonify({'error': 'Booking not found'}), 404

    booking = bookings[idx]
    # Owner can approve/reject, tenant can cancel
    if data['status'] in ['approved', 'rejected'] and booking['ownerId'] != user['id']:
        return jsonify({'error': 'Only the owner can approve/reject'}), 403
    if data['status'] == 'cancelled' and booking['tenantId'] != user['id']:
        return jsonify({'error': 'Only the tenant can cancel'}), 403

    bookings[idx]['status'] = data['status']
    save_data('bookings', bookings)
    return jsonify(bookings[idx]), 200

# ═══════════════════════════════════════════════════════════════════════════════
#  REVIEWS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/reviews/<room_id>', methods=['GET'])
def get_reviews(room_id):
    reviews = load_data('reviews')
    room_reviews = [r for r in reviews if r['roomId'] == room_id]
    room_reviews.sort(key=lambda r: r['createdAt'], reverse=True)
    return jsonify(room_reviews), 200


@app.route('/api/reviews', methods=['POST'])
def add_review():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data or 'roomId' not in data or 'rating' not in data:
        return jsonify({'error': 'Room ID and rating required'}), 400

    if not (1 <= int(data['rating']) <= 5):
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400

    reviews = load_data('reviews')

    # Check if user already reviewed this room
    existing = next((r for r in reviews if r['roomId'] == data['roomId'] and r['userId'] == user['id']), None)
    if existing:
        return jsonify({'error': 'You have already reviewed this room'}), 409

    new_review = {
        'id': str(uuid.uuid4()),
        'roomId': data['roomId'],
        'userId': user['id'],
        'userName': user['name'],
        'userAvatar': user.get('avatar', ''),
        'rating': int(data['rating']),
        'comment': data.get('comment', ''),
        'createdAt': datetime.now().isoformat()
    }

    reviews.append(new_review)
    save_data('reviews', reviews)
    return jsonify(new_review), 201

# ═══════════════════════════════════════════════════════════════════════════════
#  FAVORITES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    favorites = load_data('favorites')
    user_favs = [f for f in favorites if f['userId'] == user['id']]

    rooms = load_data('rooms')
    reviews = load_data('reviews')
    favorite_rooms = []
    for fav in user_favs:
        room = next((r for r in rooms if r['id'] == fav['roomId']), None)
        if room:
            room_reviews = [rv for rv in reviews if rv['roomId'] == room['id']]
            room['avgRating'] = round(sum(rv['rating'] for rv in room_reviews) / len(room_reviews), 1) if room_reviews else 0
            room['reviewCount'] = len(room_reviews)
            favorite_rooms.append(room)

    return jsonify(favorite_rooms), 200


@app.route('/api/favorites/check/<room_id>', methods=['GET'])
def check_favorite(room_id):
    user = require_auth()
    if not user:
        return jsonify({'isFavorite': False}), 200

    favorites = load_data('favorites')
    is_fav = any(f['userId'] == user['id'] and f['roomId'] == room_id for f in favorites)
    return jsonify({'isFavorite': is_fav}), 200


@app.route('/api/favorites/toggle', methods=['POST'])
def toggle_favorite():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data or 'roomId' not in data:
        return jsonify({'error': 'Room ID required'}), 400

    favorites = load_data('favorites')
    existing = next((i for i, f in enumerate(favorites) if f['userId'] == user['id'] and f['roomId'] == data['roomId']), None)

    if existing is not None:
        favorites.pop(existing)
        save_data('favorites', favorites)
        return jsonify({'isFavorite': False, 'message': 'Removed from favorites'}), 200
    else:
        new_fav = {
            'id': str(uuid.uuid4()),
            'userId': user['id'],
            'roomId': data['roomId'],
            'createdAt': datetime.now().isoformat()
        }
        favorites.append(new_fav)
        save_data('favorites', favorites)
        return jsonify({'isFavorite': True, 'message': 'Added to favorites'}), 200

# ═══════════════════════════════════════════════════════════════════════════════
#  MESSAGES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/messages', methods=['POST'])
def send_message():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data or 'receiverId' not in data or 'content' not in data:
        return jsonify({'error': 'Receiver ID and content required'}), 400

    messages = load_data('messages')
    users = load_data('users')

    receiver = next((u for u in users if u['id'] == data['receiverId']), None)
    if not receiver:
        return jsonify({'error': 'Receiver not found'}), 404

    new_msg = {
        'id': str(uuid.uuid4()),
        'senderId': user['id'],
        'senderName': user['name'],
        'receiverId': data['receiverId'],
        'receiverName': receiver['name'],
        'content': data['content'],
        'roomId': data.get('roomId', ''),
        'read': False,
        'createdAt': datetime.now().isoformat()
    }

    messages.append(new_msg)
    save_data('messages', messages)
    return jsonify(new_msg), 201


@app.route('/api/messages/conversations', methods=['GET'])
def get_conversations():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    messages = load_data('messages')
    user_messages = [m for m in messages if m['senderId'] == user['id'] or m['receiverId'] == user['id']]

    conversations = {}
    for msg in user_messages:
        other_id = msg['receiverId'] if msg['senderId'] == user['id'] else msg['senderId']
        other_name = msg['receiverName'] if msg['senderId'] == user['id'] else msg['senderName']

        if other_id not in conversations or msg['createdAt'] > conversations[other_id]['lastMessage']['createdAt']:
            unread_count = len([m for m in user_messages if m['senderId'] == other_id and m['receiverId'] == user['id'] and not m.get('read', False)])
            conversations[other_id] = {
                'userId': other_id,
                'userName': other_name,
                'lastMessage': msg,
                'unreadCount': unread_count
            }

    result = list(conversations.values())
    result.sort(key=lambda c: c['lastMessage']['createdAt'], reverse=True)
    return jsonify(result), 200


@app.route('/api/messages/thread/<other_user_id>', methods=['GET'])
def get_thread(other_user_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    messages = load_data('messages')
    thread = [m for m in messages if
              (m['senderId'] == user['id'] and m['receiverId'] == other_user_id) or
              (m['senderId'] == other_user_id and m['receiverId'] == user['id'])]

    # Mark messages as read
    all_messages = load_data('messages')
    for i, msg in enumerate(all_messages):
        if msg['senderId'] == other_user_id and msg['receiverId'] == user['id']:
            all_messages[i]['read'] = True
    save_data('messages', all_messages)

    thread.sort(key=lambda m: m['createdAt'])
    return jsonify(thread), 200

# ═══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD (Owner Stats)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    user = require_auth()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401

    rooms = load_data('rooms')
    bookings = load_data('bookings')
    reviews = load_data('reviews')
    messages = load_data('messages')

    my_rooms = [r for r in rooms if r['ownerId'] == user['id']]
    my_room_ids = [r['id'] for r in my_rooms]

    my_bookings = [b for b in bookings if b['ownerId'] == user['id']]
    approved_bookings = [b for b in my_bookings if b['status'] == 'approved']

    my_reviews = [r for r in reviews if r['roomId'] in my_room_ids]
    avg_rating = round(sum(r['rating'] for r in my_reviews) / len(my_reviews), 1) if my_reviews else 0

    total_views = sum(r.get('views', 0) for r in my_rooms)

    unread_msgs = len([m for m in messages if m['receiverId'] == user['id'] and not m.get('read', False)])

    pending_bookings = [b for b in my_bookings if b['status'] == 'pending']

    # Monthly revenue estimate
    monthly_revenue = sum(b['roomPrice'] for b in approved_bookings)

    stats = {
        'totalRooms': len(my_rooms),
        'totalBookings': len(my_bookings),
        'approvedBookings': len(approved_bookings),
        'pendingBookings': len(pending_bookings),
        'totalReviews': len(my_reviews),
        'avgRating': avg_rating,
        'totalViews': total_views,
        'monthlyRevenue': monthly_revenue,
        'unreadMessages': unread_msgs
    }

    return jsonify(stats), 200

# ═══════════════════════════════════════════════════════════════════════════════
#  CONTACT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.get_json()
    required = ['name', 'email', 'subject', 'message']
    if not all(field in data for field in required):
        return jsonify({'error': 'All fields are required'}), 400

    contacts = load_data('contacts')
    new_contact = {
        'id': str(uuid.uuid4()),
        'name': data['name'],
        'email': data['email'],
        'subject': data['subject'],
        'message': data['message'],
        'createdAt': datetime.now().isoformat()
    }

    contacts.append(new_contact)
    save_data('contacts', contacts)
    return jsonify({'message': 'Message sent successfully!'}), 201

# ═══════════════════════════════════════════════════════════════════════════════
#  RUN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("\n🏠 HomeRent Pro API Server")
    print("=" * 40)
    print("Server running at: http://localhost:5000")
    print("=" * 40 + "\n")
    app.run(debug=True, port=5000)
