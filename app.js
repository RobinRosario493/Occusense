[24-09-2025 09:52] Roystan SJEC: // screens/DashboardScreen.js
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
[24-09-2025 09:52] Roystan SJEC: import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function LogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'entry', 'exit'
  const [dateRange, setDateRange] = useState('today'); // 'today', 'week', 'month', 'all'
  const [refreshing, setRefreshing] = useState(false);

  // Calculate date ranges
  const getDateRange = (range) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return {
          start: startOfDay,
          end: now,
          label: 'Today'
        };
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        return {
          start: startOfWeek,
          end: now,
          label: 'Last 7 Days'
        };
      case 'month':
        const startOfMonth = new Date(now);
        startOfMonth.setDate(now.getDate() - 30);
        return {
          start: startOfMonth,
          end: now,
          label: 'Last 30 Days'
        };
      case 'all':
        return {
          start: null,
          end: now,
          label: 'All Time'
        };
      default:
        return {
          start: startOfDay,
          end: now,
          label: 'Today'
        };
    }
  };

  // Real-time listener for entries collection with date filtering
  useEffect(() => {
    console.log('🔄 Setting up real-time listener for entries collection');
    
    try {
      const dateRangeFilter = getDateRange(dateRange);
      console.log('Date range filter:', dateRangeFilter);

      let baseQuery = collection(db, 'entries');
      
      // Build query based on filters
      let constraints = [orderBy('timestamp', 'desc')];
      
      // Add date range constraint if not "all time"
      if (dateRangeFilter.start) {
        constraints.push(where('timestamp', '>=', dateRangeFilter.start.toISOString()));
      }
      
      // Add event type constraint if not "all"
      if (filter !== 'all') {
        constraints.push(where('event', '==', filter));
      }

      const q = query(baseQuery, ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log('📨 Received', querySnapshot.size, 'log entries');
          
          const logsData = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            logsData.push({
              id: doc.id,
              type: data.event === 'entry' ? 'Entry Event' : 'Exit Event',
              description: data.event === 'entry' 
                ? 'Person detected entering' 
                : 'Person detected leaving',
              timestamp: data.timestamp,
              track_id: data.track_id || data.trueL_id || 0,
              rawData: data
            });
          });

          setLogs(logsData);
          setLoading(false);
          setRefreshing(false);
          setError('');
        },
        (error) => {
          console.error('🔥 Firebase error:', error);
          setError('Failed to load logs: ' + error.message);
          setLoading(false);
          setRefreshing(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('🎯 Setup error:', error);
      setError('Setup error: ' + error.message);
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, dateRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    setError('');
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return 'Recent activity';
    }

    try {
      let date;

      // Handle Firestore Timestamp objects
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } 
      // Handle string timestamps
      else if (typeof timestamp === 'string') {
        let cleanTimestamp = timestamp.trim();
        
        // Handle ISO format
        if (cleanTimestamp.includes('T') && cleanTimestamp.includes(':')) {
          cleanTimestamp = cleanTimestamp.replace('T', ' ').split('.')[0];
        }
        // Handle your format
        else if (cleanTimestamp.includes('/') && cleanTimestamp.includes('T')) {
          cleanTimestamp = cleanTimestamp
            .replace('T', ' ')
            .replace(/\//g, '-')
            .substring(0, 19);
        }
        
        date = new Date(cleanTimestamp);
        
        if (isNaN(date.getTime())) {
          date = new Date(timestamp);
        }
      }
      // Handle object with seconds
      else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      else {
        return 'Recent activity';
      }

      if (isNaN(date.getTime())) {
        return 'Recent activity';
      }

      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

      if (isToday) {
        return Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })};
      } else if (isYesterday) {
        return Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })};
      } else {
        return ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })};
      }
    } catch (error) {
      return 'Recent activity';
    }
  };

  const getEventIcon = (type) => {
    return type === 'Entry Event' ? 'log-in' : 'log-out';
  };

  const getEventColor = (type) => {
    return type === 'Entry Event' ? '#4CAF50' : '#FF6B6B';
  };

  const getDateRangeLabel = () => {
    const ranges = {
      'today': 'Today',
      'week': 'Last 7 Days',
      'month': 'Last 30 Days',
      'all': 'All Time'
    };
    return ranges[dateRange] || 'Today';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading activity logs...</Text>
        <Text style={styles.debugText}>Reading from entries collection</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list" size={28} color="#007AFF" />
        <Text style={styles.title}>Occupancy Logs</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={refreshing ? '#ccc' : '#007AFF'} />
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      <View style={styles.dateRangeContainer}>
        <Text style={styles.filterLabel}>Date Range:</Text>
        <View style={styles.dateRangeButtons}>
          <TouchableOpacity 
            style={[styles.dateRangeButton, dateRange === 'today' && styles.dateRangeButtonActive]}
            onPress={() => setDateRange('today')}
          >
            <Text style={[styles.dateRangeText, dateRange === 'today' && styles.dateRangeTextActive]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dateRangeButton, dateRange === 'week' && styles.dateRangeButtonActive]}
            onPress={() => setDateRange('week')}
          >
            <Text style={[styles.dateRangeText, dateRange === 'week' && styles.dateRangeTextActive]}>
              7 Days
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dateRangeButton, dateRange === 'month' && styles.dateRangeButtonActive]}
            onPress={() => setDateRange('month')}
          >
            <Text style={[styles.dateRangeText, dateRange === 'month' && styles.dateRangeTextActive]}>
              30 Days
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dateRangeButton, dateRange === 'all' && styles.dateRangeButtonActive]}
            onPress={() => setDateRange('all')}
          >
            <Text style={[styles.dateRangeText, dateRange === 'all' && styles.dateRangeTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Event Type Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Event Type:</Text>
        <View style={styles.eventTypeButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All Events
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, filter === 'entry' && styles.filterButtonActive]}
            onPress={() => setFilter('entry')}
          >
            <Text style={[styles.filterText, filter === 'entry' && styles.filterTextActive]}>
              Entries
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, filter === 'exit' && styles.filterButtonActive]}
            onPress={() => setFilter('exit')}
          >
            <Text style={[styles.filterText, filter === 'exit' && styles.filterTextActive]}>
              Exits
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning" size={32} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Check Firebase connection</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <Text style={styles.sectionTitle}>
              {getDateRangeLabel()} • {logs.length} events
            </Text>
            <Text style={styles.liveBadge}>
              <Ionicons name="pulse" size={12} color="#FF6B6B" /> LIVE
            </Text>
          </View>

          <ScrollView 
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
              />
            }
          >
            {logs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No activity recorded</Text>
                <Text style={styles.emptySubtext}>
                  No {filter !== 'all' ? filter : ''} events found for {getDateRangeLabel().toLowerCase()}
                </Text>
              </View>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logIconContainer}>
                    <Ionicons 
                      name={getEventIcon(log.type)} 
                      size={20} 
                      color={getEventColor(log.type)} 
                    />
                  </View>
                  
                  <View style={styles.logContent}>
                    <View style={styles.logHeader}>
                      <Text style={[styles.logType, { color: getEventColor(log.type) }]}>
                        {log.type}
                      </Text>
                      <Text style={styles.trackId}>ID: {log.track_id}</Text>
                    </View>
                    
                    <Text style={styles.logDescription}>{log.description}</Text>
                    
                    <View style={styles.logFooter}>
                      <Ionicons name="time" size={12} color="#888" />
                      <Text style={styles.logTime}>
                        {formatTimestamp(log.timestamp)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.dataSourceCard}>
            <Ionicons name="cloud" size={14} color="#888" />
            <Text style={styles.dataSourceText}>
              Real-time data from Firebase • {getDateRangeLabel()}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
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
    marginBottom: 20,
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
  dateRangeContainer: {
    marginBottom: 16,
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
  },
  dateRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateRangeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dateRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  dateRangeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  dateRangeTextActive: {
    color: 'white',
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  liveBadge: {
    backgroundColor: '#FF6B6B20',
    color: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  logItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logType: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackId: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  logDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logTime: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
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
[24-09-2025 09:53] Roystan SJEC: import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function LiveFeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Camera Feed</Text>
      
      <View style={styles.videoPlaceholder}>
        <Text style={styles.placeholderText}>Live Video Feed Will Appear Here</Text>
        <Image
          source={{ uri: 'https://placehold.co/600x400/gray/white?text=Live+Feed' }}
          style={styles.placeholderImage}
          resizeMode="cover"
        />
      </View>
      
      <View style={styles.controls}>
        <Text style={styles.controlText}>Camera: Security Room A1</Text>
        <Text style={styles.controlText}>Status: Live • 94.2% Accuracy</Text>
        <Text style={styles.controlText}>Current Occupancy: 10 people</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  placeholderImage: {
    width: '100%',
    height: '80%',
  },
  controls: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlText: {
    fontSize: 16,
    marginBottom: 8,
  },
});
[24-09-2025 09:53] Roystan SJEC: import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native'; // ← ADD THIS
import { auth } from './firebase'; // ← ADD THIS
import { onAuthStateChanged, signOut } from 'firebase/auth'; // ← ADD THIS

// Import your screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import LogsScreen from './screens/LogsScreen';
import LiveFeedScreen from './screens/LiveFeedScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null); // ← ADD THIS

  // Check if user is already logged in from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setIsLoggedIn(true);
        setUser(user);
      } else {
        // User is signed out
        setIsLoggedIn(false);
        setUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUser(null);
    } catch (error) {
      Alert.alert('Logout Error', 'Failed to logout. Please try again.');
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: handleLogout,
          style: 'destructive',
        },
      ]
    );
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Dashboard') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Logs') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'LiveFeed') {
              iconName = focused ? 'videocam' : 'videocam-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
        />
        <Tab.Screen 
          name="Logs" 
          component={LogsScreen} 
        />
        <Tab.Screen 
          name="LiveFeed" 
          component={LiveFeedScreen}
          options={{ title: 'Live Feed' }}
        />
      </Tab.Navigator>
      
      {/* Logout Button - Fixed Position */}
      <Ionicons 
        name="log-out-outline" 
        size={24} 
        color="gray" 
        style={{ 
          position: 'absolute', 
          right: 20, 
          bottom: 50, // Changed from bottom: 10 to avoid tab bar
          padding: 10,
          backgroundColor: 'white',
          borderRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          zIndex: 1000,
        }}
        onPress={confirmLogout}
      />
    </NavigationContainer>
  );
}
