from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib import messages
from django.contrib.auth.models import User, auth
from django.contrib.auth.decorators import login_required
import requests
from django.conf import settings 
import logging
from django.http import JsonResponse
# from bs4 import BeautifulSoup as bs
# import re
def index(request):
    return render(request, 'index.html')

DEEZER_API_BASE = "https://api.deezer.com"

def music_player_view(request):
    """
    View to display the music player page.
    Fetches artist and track data from the Deezer API.
    """
    context = {
        'artist_name': None,
        'tracks': [],
        'error_message': None,
        'query': '' # To keep the search term in the input box
    }
    
    # Get the search query from the GET request, default to a popular artist
    query = request.GET.get('q', 'Daft Punk') # Default search if none provided
    context['query'] = query

    if query:
        try:
            # 1. Search for the artist ID using the query
            search_url = f"{DEEZER_API_BASE}/search/artist?q={query}&limit=1"
            response_search = requests.get(search_url)
            response_search.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
            search_data = response_search.json()

            if search_data.get('data') and len(search_data['data']) > 0:
                artist_info = search_data['data'][0]
                artist_id = artist_info['id']
                artist_name = artist_info['name']
                context['artist_name'] = artist_name

                # 2. Get the artist's top tracks using the ID
                tracks_url = f"{DEEZER_API_BASE}/artist/{artist_id}/top?limit=15" # Get top 15 tracks
                response_tracks = requests.get(tracks_url)
                response_tracks.raise_for_status()
                tracks_data = response_tracks.json()

                if tracks_data.get('data'):
                    # Process track data for the template
                    tracks_list = []
                    for track in tracks_data['data']:
                        duration_seconds = track.get('duration', 0)
                        minutes = duration_seconds // 60
                        seconds = duration_seconds % 60
                        formatted_duration = f"{minutes}:{seconds:02d}" # Format as M:SS

                        tracks_list.append({
                            'id': track.get('id'),
                            'title': track.get('title_short'),
                            'preview_url': track.get('preview'), # Deezer provides 30s previews
                            'duration': formatted_duration,
                            'artist': track.get('artist', {}).get('name'),
                            'album_cover': track.get('album', {}).get('cover_medium'), # Get medium cover art
                        })
                    context['tracks'] = tracks_list
                else:
                     context['error_message'] = f"Could not find top tracks for '{artist_name}'."

            else:
                context['error_message'] = f"Artist '{query}' not found."

        except requests.exceptions.RequestException as e:
            # Handle network errors, timeouts, invalid responses etc.
            print(f"API Request Error: {e}") # Log the error for debugging
            context['error_message'] = "Could not connect to the music service API. Please try again later."
        except Exception as e:
            # Handle other potential errors (e.g., JSON parsing)
            print(f"An unexpected error occurred: {e}") # Log the error
            context['error_message'] = "An unexpected error occurred."


    return render(request, 'music_player.html', context)


def music_view(request):
    query = request.GET.get('query', 'eminem')  # default search
    url = f"https://api.deezer.com/search?q={query}"
    response = requests.get(url)
    data = response.json()

    tracks = data.get('data', [])  # List of songs

    return render(request, 'music.html', {'tracks': tracks, 'query': query})


def login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']

        user = auth.authenticate(username=username, password=password)

        if user is not None:
            auth.login(request, user)
            return redirect('main')
        else:
            messages.info(request, 'Credentials Invalid')
            return redirect('/')
        
    return render(request, 'login.html')

def signup(request):
    if request.method == 'POST':
        email = request.POST['email']
        username = request.POST['username']
        password = request.POST['password']
        password2 = request.POST['password2']

        if password == password2:
            if User.objects.filter(email=email).exists():
                messages.info(request, 'Email Taken')
                return redirect('signup')
            elif User.objects.filter(username=username).exists():
                messages.info(request, 'Username Taken')
                return redirect('signup')
            else:
                user = User.objects.create_user(username=username, email=email, password=password)
                user.save()

                # log user in 
                user_login = auth.authenticate(username=username, password=password)
                auth.login(request, user_login)
                return redirect('/')
        else:
            messages.info(request, 'Password Not Matching')
            return redirect('signup')
    else:    
        return render(request, 'signup.html')

@login_required(login_url='/')
def logout(request):
    auth.logout(request)
    return redirect('/')

def main(request):
    return render(request, 'main.html')

def home(request):
    return render(request, 'home.html')

def privacy_view(request):
    return render(request, 'privacy.html')

def terms_view(request):
    return render(request, 'terms.html')

def cookies_view(request):
    return render(request, 'cookies.html')

def start(request):
    return render(request, 'start.html')



# Configure logging
logger = logging.getLogger(__name__)

# View to render the main HTML page


# API view to handle search requests from the frontend
def search_api(request):
    """
    Proxies search requests to the Deezer API.
    Expects a 'q' GET parameter for the search query.
    """
    query = request.GET.get('q', None)

    if not query:
        logger.warning("Search API called without a query parameter.")
        return JsonResponse({'error': 'Search query parameter (q) is required.'}, status=400)

    # Get API credentials securely from settings
    api_key = settings.RAPIDAPI_KEY 
    api_host = settings.RAPIDAPI_HOST

    if not api_key or api_key == 'YOUR_RAPIDAPI_KEY' or not api_host:
        logger.error("Deezer API Key or Host is not configured in Django settings.")
        return JsonResponse({'error': 'Server configuration error: API credentials missing.'}, status=500)

    url = f"https://{api_host}/search"
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": api_host
    }
    params = {"q": query}

    logger.info(f"Making Deezer API request to {url} with query: '{query}'")

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10) # Added timeout
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        deezer_data = response.json()
        logger.info(f"Received Deezer API response. Status: {response.status_code}")

        # Check if the expected 'data' key exists and is a list
        if isinstance(deezer_data, dict) and 'data' in deezer_data and isinstance(deezer_data['data'], list):
             # Return the structure the frontend expects
            return JsonResponse({'data': deezer_data['data']})
        else:
            logger.warning(f"Unexpected Deezer API response format: {deezer_data}")
            return JsonResponse({'error': 'Unexpected response format from music service.'}, status=500)

    except requests.exceptions.Timeout:
        logger.error(f"Deezer API request timed out for query: '{query}'")
        return JsonResponse({'error': 'Music service request timed out.'}, status=504) # Gateway Timeout
    except requests.exceptions.HTTPError as http_err:
        logger.error(f"Deezer API HTTP error: {http_err.response.status_code} - {http_err.response.text}")
        if http_err.response.status_code == 401 or http_err.response.status_code == 403:
             return JsonResponse({'error': 'API Authentication Failed. Check server API key.'}, status=403)
        elif http_err.response.status_code == 429:
            return JsonResponse({'error': 'API rate limit exceeded. Please try again later.'}, status=429)
        else:
            return JsonResponse({'error': f'Music service error (HTTP {http_err.response.status_code}).'}, status=502) # Bad Gateway
    except requests.exceptions.RequestException as req_err:
        logger.error(f"Deezer API request error: {req_err}")
        return JsonResponse({'error': 'Could not connect to music service.'}, status=503) # Service Unavailable
    except Exception as e:
        logger.exception(f"An unexpected error occurred during search API call for query '{query}': {e}")
        return JsonResponse({'error': 'An unexpected server error occurred.'}, status=500)
    

