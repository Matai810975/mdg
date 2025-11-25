#!/usr/bin/env node

const { generateDtos } = require('./dist/index.js');
const fs = require('fs');
const path = require('path');

async function runBenchmark() {
  console.log('🚀 mikro-dto-generator Performance Benchmark\n');

  // Clean up any previous benchmark output
  const benchmarkOutputDir = path.join(__dirname, 'benchmark-output');
  if (fs.existsSync(benchmarkOutputDir)) {
    fs.rmSync(benchmarkOutputDir, { recursive: true });
  }

  // Run multiple iterations to get average performance
  const iterations = 3;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`⏳ Running iteration ${i + 1}/${iterations}...`);

    // Clean output directory
    if (fs.existsSync(benchmarkOutputDir)) {
      fs.rmSync(benchmarkOutputDir, { recursive: true });
    }

    const startTime = Date.now();

    try {
      await generateDtos({
        input: 'src/test/entities/*.ts',
        output: benchmarkOutputDir,
        generateDto: true,
        generateCreateDto: true,
        generateUpdateDto: true,
        generateFindManyDto: true,
        generateMapping: true,
        generateCreateDtoToEntity: true,
        generateUpdateDtoToEntity: true,
        generateFindManyToFilter: true
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      results.push(duration);

      console.log(`   Completed in ${duration}ms`);
    } catch (error) {
      console.error(`   ❌ Error in iteration ${i + 1}:`, error.message);
      // Don't include failed iterations in results
    }
  }

  // Calculate and display results
  if (results.length > 0) {
    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const minTime = Math.min(...results);
    const maxTime = Math.max(...results);

    console.log('\n📊 Benchmark Results:');
    console.log(`   Iterations completed: ${results.length}/${iterations}`);
    console.log(`   Average time: ${avgTime.toFixed(0)}ms`);
    console.log(`   Fastest time: ${minTime}ms`);
    console.log(`   Slowest time: ${maxTime}ms`);
    console.log(`   Performance range: ±${((maxTime - minTime) / avgTime * 50).toFixed(1)}%`);

    // Clean up benchmark output
    if (fs.existsSync(benchmarkOutputDir)) {
      fs.rmSync(benchmarkOutputDir, { recursive: true });
    }

    console.log('\n✅ Benchmark completed successfully!');
  } else {
    console.log('❌ All benchmark iterations failed');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
mikro-dto-generator Performance Benchmark

Usage:
  node benchmark.js [options]

Options:
  --help, -h    Show this help message

Description:
  Runs multiple iterations of the DTO generation process
  and reports average performance metrics.
  `);
  process.exit(0);
}

// Run the benchmark
runBenchmark().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});