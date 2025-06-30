// src/pages/ProjectData.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ChevronDown, Loader2, AlertCircle, Package, Scale, MapPin, Layers } from 'lucide-react';

interface SherdObject {
  id: string;
  diagnostic: string;
  qualification: string;
  weight: number;
  count: number;
  sherd_id?: string;
  created_from_image?: boolean;
  analysis_confidence?: number;
}

interface ProjectData {
  id: string;
  projectName: string;
}

const ProjectData: React.FC = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSherds: 0,
    totalWeight: 0,
    studyAreas: 0,
    containers: 0,
  });

  // Fetch available projects
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projectsData: ProjectData[] = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          projectName: doc.id.toUpperCase(),
        }));
        setProjects(projectsData);
      } catch (err) {
        setError('Failed to fetch projects');
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch data for selected project
  const fetchProjectData = async (projectId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const allData: any[] = [];
      let totalSherds = 0;
      let totalWeight = 0;
      let studyAreaCount = 0;
      let containerCount = 0;

      // Get all study areas
      const studyAreasSnapshot = await getDocs(
        collection(db, 'projects', projectId, 'studyAreas')
      );

      studyAreaCount = studyAreasSnapshot.docs.length;

      for (const studyAreaDoc of studyAreasSnapshot.docs) {
        const studyAreaId = studyAreaDoc.id;

        // Get all strat units
        const stratUnitsSnapshot = await getDocs(
          collection(db, 'projects', projectId, 'studyAreas', studyAreaId, 'stratUnits')
        );

        for (const stratUnitDoc of stratUnitsSnapshot.docs) {
          const stratUnitId = stratUnitDoc.id;

          // Get all containers
          const containersSnapshot = await getDocs(
            collection(db, 'projects', projectId, 'studyAreas', studyAreaId, 'stratUnits', stratUnitId, 'containers')
          );

          containerCount += containersSnapshot.docs.length;

          for (const containerDoc of containersSnapshot.docs) {
            const containerId = containerDoc.id;

            // Get all groups
            const groupsSnapshot = await getDocs(
              collection(db, 'projects', projectId, 'studyAreas', studyAreaId, 'stratUnits', stratUnitId, 'containers', containerId, 'groups')
            );

            for (const groupDoc of groupsSnapshot.docs) {
              const groupId = groupDoc.id;
              const groupData = groupDoc.data();

              // Get all objects in this group
              const objectsSnapshot = await getDocs(
                collection(db, 'projects', projectId, 'studyAreas', studyAreaId, 'stratUnits', stratUnitId, 'containers', containerId, 'groups', groupId, 'objects')
              );

              for (const objectDoc of objectsSnapshot.docs) {
                const objectData = objectDoc.data() as SherdObject;
                
                allData.push({
                  id: `${studyAreaId}-${stratUnitId}-${containerId}-${groupId}-${objectDoc.id}`,
                  studyArea: studyAreaId,
                  stratUnit: stratUnitId,
                  container: containerId,
                  group: groupData.label || 'Unknown',
                  diagnostic: objectData.diagnostic,
                  qualification: objectData.qualification,
                  weight: objectData.weight,
                  count: objectData.count,
                  sherd_id: objectData.sherd_id || '-',
                  source: objectData.created_from_image ? 'AI Analysis' : 'Manual Entry',
                  confidence: objectData.analysis_confidence ? `${(objectData.analysis_confidence * 100).toFixed(1)}%` : '-',
                });

                totalSherds += objectData.count;
                totalWeight += objectData.weight;
              }
            }
          }
        }
      }

      setTableData(allData);
      setStats({
        totalSherds,
        totalWeight,
        studyAreas: studyAreaCount,
        containers: containerCount,
      });
    } catch (err) {
      setError('Failed to fetch project data');
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (projectId) {
      fetchProjectData(projectId);
    } else {
      setTableData([]);
      setStats({ totalSherds: 0, totalWeight: 0, studyAreas: 0, containers: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Project Data</h1>

      {/* Project Selection */}
      <div className="card p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <div className="relative">
          <select
            value={selectedProject}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="input-field appearance-none pr-10"
          >
            <option value="">Select a project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Statistics */}
      {selectedProject && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <Package className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary-600">{stats.totalSherds}</div>
            <div className="text-sm text-gray-600">Total Sherds</div>
          </div>
          <div className="card p-4 text-center">
            <Scale className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary-600">{stats.totalWeight.toFixed(2)}g</div>
            <div className="text-sm text-gray-600">Total Weight</div>
          </div>
          <div className="card p-4 text-center">
            <MapPin className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary-600">{stats.studyAreas}</div>
            <div className="text-sm text-gray-600">Study Areas</div>
          </div>
          <div className="card p-4 text-center">
            <Layers className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary-600">{stats.containers}</div>
            <div className="text-sm text-gray-600">Containers</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading project data...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Data Table */}
      {tableData.length > 0 && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Sherd Data for {selectedProject.toUpperCase()} ({tableData.length} records)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Study Area</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Strat Unit</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnostic</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Qualification</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (g)</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.studyArea}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.stratUnit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.container}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.group}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.diagnostic}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.qualification}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.weight}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.source === 'AI Analysis' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {row.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectData;