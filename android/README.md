# TrailSync Android App

Native Android application for TrailSync fitness tracking with step counting support.

## Status: Planned

This directory will contain the native Android application for TrailSync.

## Features (Planned)

### Core Functionality
- **GPS Tracking**: FusedLocationProviderClient for accurate location
- **Step Counting**: SensorManager with TYPE_STEP_COUNTER
- **Offline Storage**: Room database for local persistence
- **Background Tracking**: Foreground service for continuous tracking
- **Sync Service**: WorkManager for reliable background sync

### Architecture

```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/trailsync/
│   │   │   │   ├── MainActivity.java
│   │   │   │   ├── services/
│   │   │   │   │   ├── LocationService.java
│   │   │   │   │   ├── StepCounterService.java
│   │   │   │   │   └── SyncService.java
│   │   │   │   ├── database/
│   │   │   │   │   ├── AppDatabase.java
│   │   │   │   │   ├── Activity.java
│   │   │   │   │   └── ActivityDao.java
│   │   │   │   ├── api/
│   │   │   │   │   ├── ApiService.java
│   │   │   │   │   └── RetrofitClient.java
│   │   │   │   └── ui/
│   │   │   │       ├── TrackingFragment.java
│   │   │   │       ├── HistoryFragment.java
│   │   │   │       └── SettingsFragment.java
│   │   │   └── AndroidManifest.xml
│   │   └── res/
│   │       ├── layout/
│   │       ├── values/
│   │       └── drawable/
│   └── build.gradle
└── build.gradle
```

## Key Components

### LocationService.java
```java
public class LocationService extends Service {
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    
    // High accuracy GPS tracking
    // Battery optimization
    // Route point collection
}
```

### StepCounterService.java
```java
public class StepCounterService extends Service implements SensorEventListener {
    private SensorManager sensorManager;
    private Sensor stepCounter;
    
    // Step counting using TYPE_STEP_COUNTER
    // Persistent step data
    // Battery efficient implementation
}
```

### Room Database
```java
@Database(entities = {Activity.class}, version = 1)
public abstract class AppDatabase extends RoomDatabase {
    public abstract ActivityDao activityDao();
}

@Entity
public class Activity {
    @PrimaryKey(autoGenerate = true)
    private int id;
    private String serverId;
    private String type;
    private long startTime;
    private long endTime;
    // ... other fields
}
```

### API Integration
```java
public interface ApiService {
    @GET("activities")
    Call<List<Activity>> getActivities();
    
    @POST("activities")
    Call<Activity> createActivity(@Body Activity activity);
    
    @POST("activities/sync")
    Call<SyncResponse> syncActivities(@Body SyncRequest request);
}
```

## Permissions Required

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Build Requirements

- Android Studio Arctic Fox or later
- Minimum SDK: 26 (Android 8.0)
- Target SDK: 34 (Android 14)
- Java 11+
- Gradle 8.0+

## Dependencies

```gradle
dependencies {
    // AndroidX
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // Location
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    
    // Room
    implementation 'androidx.room:room-runtime:2.6.1'
    annotationProcessor 'androidx.room:room-compiler:2.6.1'
    
    // WorkManager
    implementation 'androidx.work:work-runtime:2.9.0'
    
    // Retrofit
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    
    // Maps
    implementation 'org.osmdroid:osmdroid-android:6.1.17'
}
```

## Development Steps

1. **Setup Project**
   ```bash
   # Create new Android project in Android Studio
   # Set package name: com.trailsync
   # Minimum SDK: 26
   ```

2. **Implement Core Services**
   - GPS tracking with FusedLocationProvider
   - Step counting with SensorManager
   - Foreground service for background tracking

3. **Setup Room Database**
   - Define Activity entity
   - Create DAOs
   - Implement database migrations

4. **API Integration**
   - Setup Retrofit
   - Implement sync logic
   - Handle authentication

5. **UI Development**
   - Tracking screen with live stats
   - History list with filters
   - Settings screen
   - Map integration

6. **Testing**
   - Unit tests for services
   - Integration tests for sync
   - UI tests with Espresso

## Step Counter Implementation

```java
public class StepCounterService extends Service implements SensorEventListener {
    private SensorManager sensorManager;
    private Sensor stepCounter;
    private int initialStepCount = -1;
    private int currentSteps = 0;
    
    @Override
    public void onCreate() {
        super.onCreate();
        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        
        if (stepCounter != null) {
            sensorManager.registerListener(this, stepCounter, 
                SensorManager.SENSOR_DELAY_NORMAL);
        }
    }
    
    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            int totalSteps = (int) event.values[0];
            
            if (initialStepCount == -1) {
                initialStepCount = totalSteps;
            }
            
            currentSteps = totalSteps - initialStepCount;
            // Update UI or database with current step count
        }
    }
}
```

## Sync Strategy

```java
public class SyncWorker extends Worker {
    @Override
    public Result doWork() {
        // Get pending activities from Room
        List<Activity> pendingActivities = database.activityDao()
            .getPendingSync();
        
        // Sync with backend
        SyncRequest request = new SyncRequest(pendingActivities);
        Response<SyncResponse> response = apiService.syncActivities(request)
            .execute();
        
        if (response.isSuccessful()) {
            // Update local database with server IDs
            // Mark activities as synced
            return Result.success();
        }
        
        return Result.retry();
    }
}
```

## Background Location

```java
// Start foreground service with notification
public class LocationService extends Service {
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);
        
        startLocationUpdates();
        return START_STICKY;
    }
    
    private void startLocationUpdates() {
        LocationRequest locationRequest = LocationRequest.create()
            .setInterval(5000)
            .setFastestInterval(2000)
            .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
        
        fusedLocationClient.requestLocationUpdates(
            locationRequest, locationCallback, Looper.getMainLooper());
    }
}
```

## Battery Optimization

- Use batched location updates when appropriate
- Implement doze mode compatibility
- Optimize sensor sampling rates
- Use WorkManager for deferred sync
- Implement smart wake locks

## Testing on Device

```bash
# Install APK
adb install app-debug.apk

# Check step counter availability
adb shell dumpsys sensorservice | grep -i step

# Monitor GPS accuracy
adb shell dumpsys location

# Check battery usage
adb shell dumpsys batterystats
```

## Future Enhancements

- Wear OS companion app
- Bluetooth heart rate monitor support
- Audio coaching during activities
- Advanced route planning
- Offline map caching
- Widget support

## Contributing

When implementing the Android app:
1. Follow Material Design guidelines
2. Use AndroidX libraries
3. Implement proper error handling
4. Add comprehensive logging
5. Write unit and integration tests
6. Document all public APIs

## Resources

- [Android Location Documentation](https://developer.android.com/training/location)
- [Sensor Overview](https://developer.android.com/guide/topics/sensors/sensors_overview)
- [Room Persistence Library](https://developer.android.com/training/data-storage/room)
- [WorkManager Documentation](https://developer.android.com/topic/libraries/architecture/workmanager)
