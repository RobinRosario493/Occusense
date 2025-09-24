// screens/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const [currentOccupancy, setCurrentOccupancy] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Real-time listener for occupancy data
  useEffect(() => {
    console.log('🔄 Setting up Firebase listener for occupancy/live');
    
    try {
      const unsubscribe = onSnapshot(
        doc(db, 'occupancy', 'live'), 
        (doc) => {
          console.log('📨 Firebase data received:', doc.exists() ? doc.data() : 'No data');
          
          if (doc.exists()) {
            const data = doc.data();
            const count = data.count || 0;
            console.log('✅ Count from Firebase:', count);
            
            setCurrentOccupancy(count);
            
            // Handle timestamp
            if (data.last_updated) {
              try {
                // Handle both timestamp formats
                let date;
                if (typeof data.last_updated === 'string') {
                  date = new Date(data.last_updated.replace('T', ' ').replace(/\//g, '-'));
                } else {
                  // If it's a Firestore timestamp
                  date = data.last_updated.toDate();
                }
                setLastUpdated(date.toLocaleTimeString() + ' • ' + date.toLocaleDateString());
              } catch (e) {
                console.log('❌ Timestamp error:', e);
                setLastUpdated('Recent update');
              }
            } else {
              setLastUpdated('Just now');
            }
            setError('');
          } else {
            console.log('❌ No document found at occupancy/live');
            setError('No data available');
          }
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('🔥 Firebase error:', error);
          setError('Database connection error');
          setLoading(false);
          setRefreshing(false);
        }
      );

      return () => {
        console.log('🧹 Cleaning up Firebase listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('🎯 Setup error:', error);
      setError('Setup error: ' + error.message);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update
  };

  // Calculate status and percentage
  const capacity = 25;
  const occupancyPercentage = Math.min(Math.round((currentOccupancy / capacity) * 100), 100);
  const status = currentOccupancy <= 15 ? 'Safe' : currentOccupancy <= 20 ? 'Near' : 'Over';
  const statusColor = status === 'Safe' ? '#4CAF50' : status === 'Near' ? '#FF9800' : '#F44336';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Connecting to live data...</Text>
        <Text style={styles.debugText}>Reading from occupancy/live</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="business" size={28} color="#007AFF" />
        <Text style={styles.title}>Occupancy Monitor</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={refreshing ? '#ccc' : '#007AFF'} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning" size={32} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Check Firebase connection</Text>
        </View>
      ) : (
        <>
          {/* Main Occupancy Card */}
          <View style={styles.roomCard}>
            <View style={styles.roomHeader}>
              <Ionicons name="people" size={24} color="#007AFF" />
              <Text style={styles.roomName}>Conference Room A</Text>
            </View>
            
            <View style={styles.occupancyContainer}>
              <Text style={styles.occupancyCount}>{currentOccupancy}</Text>
              <Text style={styles.occupancyLabel}>
                {currentOccupancy === 1 ? 'PERSON' : 'PEOPLE'}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: ${occupancyPercentage}%,
                      backgroundColor: statusColor
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{occupancyPercentage}% capacity</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.updateTime}>Updated: {lastUpdated}</Text>
            </View>
          </View>

          {/* Status Cards */}
          <View style={styles.statusGrid}>
            <View style={[styles.statusCard, { backgroundColor: '#E8F5E8' }]}>
              <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusTitle}>Safe</Text>
              <Text style={styles.statusRange}>0-15 people</Text>
              <Text style={[styles.statusValue, { color: '#4CAF50' }]}>
                {currentOccupancy <= 15 ? '✅ Current' : ''}
              </Text>
            </View>

            <View style={[styles.statusCard, { backgroundColor: '#FFF3E0' }]}>
              <View style={[styles.statusIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statusTitle}>Near Capacity</Text>
              <Text style={styles.statusRange}>16-20 people</Text>
              <Text style={[styles.statusValue, { color: '#FF9800' }]}>
                {currentOccupancy > 15 && currentOccupancy <= 20 ? '⚠ Current' : ''}
              </Text>
            </View>

            <View style={[styles.statusCard, { backgroundColor: '#FFEBEE' }]}>
              <View style={[styles.statusIndicator, { backgroundColor: '#F44336' }]} />
              <Text style={styles.statusTitle}>Over Capacity</Text>
              <Text style={styles.statusRange}>21+ people</Text>
              <Text style={[styles.statusValue, { color: '#F44336' }]}>
                {currentOccupancy > 20 ? '🚨 Current' : ''}
              </Text>
            </View>
          </View>

          {/* Current Status Banner */}
          <View style={[styles.currentStatusBanner, { backgroundColor: statusColor + '20' }]}>
            <Ionicons 
              name={status === 'Safe' ? 'checkmark-circle' : status === 'Near' ? 'warning' : 'alert-circle'} 
              size={24} 
              color={statusColor} 
            />
            <Text style={[styles.currentStatusText, { color: statusColor }]}>
              Current Status: {status} {status === 'Over' ? 'Capacity!' : ''}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#007AFF' }]}>
              <Ionicons name="videocam" size={20} color="white" />
              <Text style={styles.actionButtonText}>Live Feed</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#34C759' }]}>
              <Ionicons name="download" size={20} color="white" />
              <Text style={styles.actionButtonText}>Export Data</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="list" size={20} color="white" />
              <Text style={styles.actionButtonText}>View Logs</Text>
            </TouchableOpacity>
          </View>

          {/* Data Source Info */}
          <View style={styles.dataSourceCard}>
            <Ionicons name="cloud" size={16} color="#888" />
            <Text style={styles.dataSourceText}>
              Live data from Firebase • Updated in real-time
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
  },
  errorCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  roomCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  roomName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  occupancyContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  occupancyCount: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
    lineHeight: 72,
  },
  occupancyLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateTime: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    minHeight: 120,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusRange: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  currentStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  dataSourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dataSourceText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
});
