import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="home-card">
      <h1 className="home-title">Welcome to the Archaeological Recording and Classification (ARC) Platform</h1>
      <p className="home-desc">
      ARC is an archaeological data recording platform with two primary functions. First, it increases the efficiency of archaeological specialists by supporting the transition from recording entry to recording review. It does so by providing an easy, fast, and non-invasive way to automatically record and classify sherds. Instead of spending time on data entry for straightforward classification, specialists can focus their expertise on interesting and unique sherds and ask bigger questions.  
      </p>
      <p className="home-desc">
      Additionally, it supports data reuse through the large-scale digitization of non-diagnostic archaeological data in a comparable format. For each ‘dump image’ that the user takes, all the individual sherds within it are cataloged into a central database in a comparable format on top of the project-specific catalog. This includes the following fields: a digital image, location, weight estimation, volume estimation, general classifications and features, and the associated project. 
      </p>
      <p className="home-desc home-desc-secondary">
      While systems such as ADS or ARIADNE provide the infrastructure for storing and integrating archaeological data, ARC serves as the data collection interface that will digitize and collect image-based data in a uniform and large scale. This will then all combine to contribute toward the creation of a new digital and machine learning era of archaeology with the increases in labeled digital images. 
      </p>
      <div style={{ marginTop: '32px' }}>
        <a href="/universal-data" className="home-btn">
          View Data List
        </a>
      </div>
    </div>
  );
};

export default Home;