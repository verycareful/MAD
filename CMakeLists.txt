cmake_minimum_required(VERSION 3.16)
project(MAD VERSION 0.1.0 CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Release build by default for performance
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O2")

add_executable(mad
  src/main.cpp
  src/mad.cpp
)

target_include_directories(mad PRIVATE src)

# Create output dir at build time
add_custom_command(TARGET mad POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E make_directory
    $<TARGET_FILE_DIR:mad>/output
)
