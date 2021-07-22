/******************************************
	AUTH
 *****************************************/

variable "keypath" {
  type = string
  default = null
}

/******************************************
	GCP
 *****************************************/

variable "cluster_id" {
  type = string
}

variable "project_id" {
  type = string
}

variable "network" {
  type = string
}

variable "region" {
  type = string
}

variable "zone" {
  type = string
  default = null
}

variable "subnetwork" {
  type = string
  default = null
}

variable "filestore_address" {
  type = string
  default = ""
}

variable "gcs_bucket" {
  type = string
  default = null
  description = "The name for the provided GCS bucket"
}

variable "service_account_email" {
  type = string
  default = null
}

variable "create_static_ip" {
  type = bool
  default = true
}


/******************************************
	Cluster
 *****************************************/

variable "master_instance_type" {
  type = string
  default = "n1-standard-2"
}

variable "aux_agent_instance_type" {
  type = string
  default = "n1-standard-4"
}

variable "compute_agent_instance_type" {
  type = string
  default = "n1-standard-32"
}

variable "gpu_type" {
  type = string
  default = "nvidia-tesla-k80"
}

variable "gpu_num" {
  type = number
  default = 8
}

variable "min_dynamic_agents" {
  type = number
  default = 0
}

variable "max_dynamic_agents" {
  type = number
  default = 5
}

variable "static_agents" {
  type = number
  default = 0
}

variable "preemptible" {
  type = bool
  default = false
}

variable "operation_timeout_period" {
  type = string
  default = "5m"
}

variable "agent_docker_network" {
  type = string
  default = "host"
}

variable "master_docker_network" {
  type = string
  default = "determined"
}

variable "max_aux_containers_per_agent" {
  type = number
  default = 100
}

variable "max_idle_agent_period" {
  type = string
  default = "10m"
}

variable "max_agent_starting_period" {
  type = string
  default = "10m"
}

variable "min_cpu_platform_master" {
  type = string
  default = "Intel Skylake"
}

variable "min_cpu_platform_agent" {
  type = string
  default = "Intel Broadwell"
}

variable "scheduler_type" {
  type = string
  default = "fair_share"
}

variable "preemption_enabled" {
  type = bool
  default = false
}

/******************************************
	Determined
 *****************************************/

variable "environment_image" {
  type = string
}

variable "image_repo_prefix" {
  type = string
  default = "determinedai"
}

variable "det_version" {
  type = string
}

variable "det_version_key" {
  type = string
}

variable "cpu_env_image" {
  type = string
  default = ""
}

variable "gpu_env_image" {
  type = string
  default = ""
}

/******************************************
	Master
 *****************************************/

variable "scheme" {
  type = string
  default = "http"
}

variable "port" {
  type = number
  default = 8080
}

variable "master_config_template" {
  type = string
  default = <<EOF
checkpoint_storage:
  type: gcs
  bucket: {{ .checkpoint_storage.bucket }}
  save_experiment_best: 0
  save_trial_best: 1
  save_trial_latest: 1

db:
  user: "{{ .db.user }}"
  password: "{{ .db.password }}"
  host: "{{ .db.host }}"
  port: {{ .db.port }}
  name: "{{ .db.name }}"
  ssl_mode: "{{ .db.ssl_mode }}"
  ssl_root_cert: "{{ .db.ssl_root_cert }}"

resource_manager:
  type: agent
  default_aux_resource_pool: aux-pool
  default_compute_resource_pool: compute-pool
  scheduler:
    type: {{ .resource_manager.scheduler.type }}
    {{- if eq .resource_manager.scheduler.type "priority" }}
    preemption: {{ .resource_manager.scheduler.preemption_enabled }}
    {{- end }}

resource_pools:
  - pool_name: aux-pool
    max_aux_containers_per_agent: {{ .resource_pools.pools.aux_pool.max_aux_containers_per_agent }}
    provider:
      instance_type:
        {{- toYaml .resource_pools.pools.aux_pool.instance_type | nindent 8 }}
      {{- toYaml .resource_pools.gcp | nindent 6}}

  - pool_name: compute-pool
    max_aux_containers_per_agent: 0
    provider:
      instance_type:
        {{- toYaml .resource_pools.pools.compute_pool.instance_type | nindent 8 }}
      cpu_slots_allowed: true
      {{- toYaml .resource_pools.gcp | nindent 6}}

{{ if or (or .cpu_env_image .gpu_env_image) .bind_mounts }}
task_container_defaults:
  {{- if .bind_mounts }}
  bind_mounts:
    {{- toYaml .bind_mounts | nindent 4}}
  {{- end }}
  {{- if or .cpu_env_image .gpu_env_image }}
  image:
    cpu: {{ .cpu_env_image }}
    gpu: {{ .gpu_env_image }}
  {{- end }}
{{ end }}
EOF
}

/******************************************
	Database
 *****************************************/

variable "db_version" {
  type = string
  default = "POSTGRES_11"
}

variable "db_tier" {
  type = string
  default = "db-f1-micro"
}

variable "db_username" {
  type = string
  default = "postgres"
}

variable "db_password" {
  type = string
  default = "postgres"
}

variable "db_ssl_enabled" {
  type = bool
  default = true
}
