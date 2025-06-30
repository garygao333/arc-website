import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Search, Loader2, AlertCircle, X, Package, BarChart2, Building, Eye, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './UniversalData.css';

interface UniversalSherdData {
  id: string;
  sherdId: string;
  projectId: string;
  studyAreaId: string;
  stratUnitId: string;
  containerId: string;
  objectGroupId: string;
  diagnosticType: string;
  qualificationType: string;
  weight: number;
  originalImageUrl?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: any;
  analysisConfidence?: number;
  notes?: string;
}

const UniversalData: React.FC = () => {
  const [sherds, setSherds] = useState<UniversalSherdData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchProject, setSearchProject] = useState('');
  const [selectedSherd, setSelectedSherd] = useState<UniversalSherdData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [availableDiagnostics, setAvailableDiagnostics] = useState<string[]>([]);
  const [selectedDiagnostics, setSelectedDiagnostics] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalSherds: 0,
    projectCounts: {} as Record<string, number>,
    diagnosticCounts: {} as Record<string, number>,
  });

  const calculateStats = (sherdData: UniversalSherdData[]) => {
    const totalSherds = sherdData.length;
    
    const projectCounts = sherdData.reduce((acc, sherd) => {
      acc[sherd.projectId] = (acc[sherd.projectId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const diagnosticCounts = sherdData.reduce((acc, sherd) => {
      acc[sherd.diagnosticType] = (acc[sherd.diagnosticType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Update available diagnostics
    const uniqueDiagnostics = Array.from(new Set(sherdData.map(sherd => sherd.diagnosticType))).filter(Boolean) as string[];
    setAvailableDiagnostics(uniqueDiagnostics);

    setStats({ totalSherds, projectCounts, diagnosticCounts });
  };

  const diagnosticDistribution = useMemo(() => {
    return Object.entries(stats.diagnosticCounts)
      .map(([name, count]) => ({
        name: name || 'Unspecified',
        count,
        percentage: (count / stats.totalSherds) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats.diagnosticCounts, stats.totalSherds]);

  const fetchSherds = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let q;
      const conditions = [];
      
      // Handle project ID filter
      if (searchProject.trim()) {
        conditions.push(where('projectId', '==', searchProject.toUpperCase()));
      }
      
      // Handle diagnostic types filter
      if (selectedDiagnostics.length > 0) {
        // Firestore has a limit of 10 items in 'in' queries
        if (selectedDiagnostics.length > 10) {
          setError('Cannot filter by more than 10 diagnostic types at once');
          setLoading(false);
          return;
        }
        conditions.push(where('diagnosticType', 'in', selectedDiagnostics));
      }
      
      // Build the query with all conditions
      if (conditions.length > 0) {
        q = query(
          collection(db, 'universal'),
          ...conditions,
          limit(500) // Remove orderBy to avoid composite index
        );
      } else {
        // No filters, just get all sherds
        q = query(
          collection(db, 'universal'),
          limit(500) // Remove orderBy to avoid composite index
        );
      }

      const snapshot = await getDocs(q);
      
      // Check if we got any results
      if (snapshot.empty) {
        setSherds([]);
        setStats({
          totalSherds: 0,
          projectCounts: {},
          diagnosticCounts: {}
        });
        return;
      }

      // Convert docs to sherd data and sort by createdAt in memory
      const sherdData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            sherdId: data.sherdId || '',
            projectId: data.projectId || '',
            studyAreaId: data.studyAreaId || '',
            stratUnitId: data.stratUnitId || '',
            containerId: data.containerId || '',
            objectGroupId: data.objectGroupId || '',
            diagnosticType: data.diagnosticType || 'Unspecified',
            qualificationType: data.qualificationType || '',
            weight: data.weight || 0,
            originalImageUrl: data.originalImageUrl || '',
            boundingBox: data.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
            x: data.x || 0,
            y: data.y || 0,
            width: data.width || 0,
            height: data.height || 0,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            analysisConfidence: data.analysisConfidence,
            notes: data.notes || ''
          } as UniversalSherdData;
        })
        // Sort by createdAt in descending order (newest first)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setSherds(sherdData);
      calculateStats(sherdData);
    } catch (err) {
      setError(`Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error fetching sherds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSherds();
  }, []);

  const handleSearch = () => {
    fetchSherds();
  };

  const handleClear = () => {
    setSearchProject('');
    setSelectedDiagnostics([]);
    fetchSherds();
  };

  const toggleDiagnostic = (diagnostic: string) => {
    setSelectedDiagnostics((prev: string[]) => 
      prev.includes(diagnostic)
        ? prev.filter((d: string) => d !== diagnostic)
        : [...prev, diagnostic]
    );
  };

  const applyFilters = () => {
    setFilterModalOpen(false);
    fetchSherds();
  };

  const clearFilters = () => {
    setSelectedDiagnostics([]);
    setFilterModalOpen(false);
    fetchSherds();
  };

  const viewSherdDetails = (sherd: UniversalSherdData) => {
    setSelectedSherd(sherd);
    setModalOpen(true);
  };

  const formatProjectId = (id: string) => {
    return id.padStart(5, '0');
  };

  return (
    <div className="universal-data">
      <h1>Universal Sherd Database</h1>

      {/* Search and Filter */}
      <div className="search-container">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by Project ID..."
            value={searchProject}
            onChange={(e) => setSearchProject(e.target.value)}
            className="search-input"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="search-button">
            <Search size={16} />
            Search
          </button>
          <button 
            onClick={() => setFilterModalOpen(true)} 
            className={`filter-button ${selectedDiagnostics.length > 0 ? 'active' : ''}`}
          >
            <Filter size={16} />
            {selectedDiagnostics.length > 0 ? `Filters (${selectedDiagnostics.length})` : 'Filters'}
          </button>
          <button onClick={handleClear} className="clear-button">
            Clear All
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-container">
        <div className="stat-card">
          <Package size={24} />
          <div className="stat-value">{stats.totalSherds}</div>
          <div className="stat-label">Total Sherds</div>
        </div>
        <div className="stat-card">
          <Building size={24} />
          <div className="stat-value">{Object.keys(stats.projectCounts).length}</div>
          <div className="stat-label">Projects</div>
        </div>
      </div>

      {/* Diagnostic Type Distribution */}
      {stats.totalSherds > 0 && (
        <div className="chart-container">
          <h3>
            <BarChart2 size={20} style={{ marginRight: '8px' }} />
            Diagnostic Type Distribution
          </h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={diagnosticDistribution}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                barSize={30}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'count') {
                      return [value, 'Count'];
                    }
                    return [value.toFixed(1) + '%', 'Percentage'];
                  }}
                />
                <Bar 
                  dataKey="count" 
                  name="Count"
                  fill="#3d2466"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-container">
          <Loader2 className="spinner" size={24} />
          <span>Loading data...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sherd ID</th>
                <th>Project ID</th>
                <th>Diagnostic Type</th>
                <th>Weight (g)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sherds.map((sherd) => (
                <tr key={sherd.id}>
                  <td>{sherd.sherdId}</td>
                  <td>{formatProjectId(sherd.projectId)}</td>
                  <td>{sherd.diagnosticType}</td>
                  <td>{sherd.weight.toFixed(2)}</td>
                  <td>
                    <button 
                      onClick={() => viewSherdDetails(sherd)}
                      className="view-button"
                    >
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <div className="modal-overlay" onClick={() => setFilterModalOpen(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filter by Diagnostic Type</h3>
              <button onClick={() => setFilterModalOpen(false)} className="close-button">
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="filter-options">
                {availableDiagnostics.map((diagnostic) => (
                  <label key={diagnostic} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedDiagnostics.includes(diagnostic)}
                      onChange={() => toggleDiagnostic(diagnostic)}
                    />
                    <span className="checkmark"></span>
                    {diagnostic}
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button onClick={clearFilters} className="secondary-button">
                  Clear All
                </button>
                <button onClick={applyFilters} className="primary-button">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <div className="modal-overlay" onClick={() => setFilterModalOpen(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filter by Diagnostic Type</h3>
              <button onClick={() => setFilterModalOpen(false)} className="close-button">
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="filter-options">
                {availableDiagnostics.map((diagnostic) => (
                  <label key={diagnostic} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedDiagnostics.includes(diagnostic)}
                      onChange={() => toggleDiagnostic(diagnostic)}
                    />
                    <span className="checkmark"></span>
                    {diagnostic}
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button onClick={clearFilters} className="secondary-button">
                  Clear All
                </button>
                <button onClick={applyFilters} className="primary-button">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {modalOpen && selectedSherd && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sherd Details</h2>
              <button onClick={() => setModalOpen(false)} className="close-button">
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="detail-row">
                <span className="detail-label">Sherd ID:</span>
                <span>{selectedSherd.sherdId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Project ID:</span>
                <span>{formatProjectId(selectedSherd.projectId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Study Area:</span>
                <span>{selectedSherd.studyAreaId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Strat Unit:</span>
                <span>{selectedSherd.stratUnitId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Container:</span>
                <span>{selectedSherd.containerId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Object Group:</span>
                <span>{selectedSherd.objectGroupId}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Diagnostic Type:</span>
                <span>{selectedSherd.diagnosticType}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Qualification:</span>
                <span>{selectedSherd.qualificationType}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Weight:</span>
                <span>{selectedSherd.weight.toFixed(2)}g</span>
              </div>
              
              {selectedSherd.notes && (
                <div className="detail-row">
                  <span className="detail-label">Notes:</span>
                  <span>{selectedSherd.notes}</span>
                </div>
              )}
              
              {selectedSherd.boundingBox && (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Bounding Box X:</span>
                    <span>{selectedSherd.boundingBox.x}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Bounding Box Y:</span>
                    <span>{selectedSherd.boundingBox.y}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Bounding Box Width:</span>
                    <span>{selectedSherd.boundingBox.width}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Bounding Box Height:</span>
                    <span>{selectedSherd.boundingBox.height}</span>
                  </div>
                </>
              )}
              
              {selectedSherd.originalImageUrl && (
                <div className="detail-row image-preview">
                  <span className="detail-label">Image:</span>
                  <div className="image-container">
                    <img 
                      src={selectedSherd.originalImageUrl} 
                      alt="Sherd preview"
                      className="sherd-image"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalData;