from django.urls import path
from . import views
urlpatterns = [
    path('index', views.index, name = 'index'),
    path('login/', views.login, name = 'login'),
    path('signup/', views.signup, name = 'signup'),
    path('music', views.music_view, name='music'),
    path('music_player', views.music_player_view, name='music_player'),
    path('main', views.main, name='main'),
    path('api/search/', views.search_api, name='search_api'),
    path('privacy/', views.privacy_view, name='privacy'),
    path('terms/', views.terms_view, name='terms'),
    path('cookies/', views.cookies_view, name='cookies'),
    path('', views.home, name='home'),
    path('start', views.start, name='start'),
    
]