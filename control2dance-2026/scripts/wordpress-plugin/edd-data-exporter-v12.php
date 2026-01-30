<?php
/**
 * Plugin Name: EDD Data Exporter (v12 - CUSTOMER HUNTER)
 * Description: Busca un ID de cliente específico en toda la base de datos
 * Version: 12.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V12 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v12', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v12', 'EDD Export v12', 'manage_options', 'edd-data-exporter-v12', [$this, 'admin_page'], 'dashicons-search', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🎯 Buscador de Cliente Específico (v12)</h1>
            <p>Este plugin va a buscar el ID <code>cus_TsntKcUggCv54U</code> en todas las tablas de metatados y clientes.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v12">
                <?php wp_nonce_field('export_edd_data_v12', 'export_nonce'); ?>
                <?php submit_button('🚀 Buscar coincidencia'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v12', 'export_nonce');
        
        global $wpdb;
        $search_id = 'cus_TsntKcUggCv54U';
        $found = [];
        
        $tables = [
            "{$wpdb->prefix}postmeta" => ['id' => 'post_id', 'key' => 'meta_key', 'val' => 'meta_value'],
            "{$wpdb->prefix}edd_ordermeta" => ['id' => 'edd_order_id', 'key' => 'meta_key', 'val' => 'meta_value'],
            "{$wpdb->prefix}edd_customers" => ['id' => 'id', 'key' => 'email', 'val' => 'notes'], // Buscamos en notas o email por si acaso
            "{$wpdb->prefix}edd_customermeta" => ['id' => 'customer_id', 'key' => 'meta_key', 'val' => 'meta_value'],
            "{$wpdb->prefix}usermeta" => ['id' => 'user_id', 'key' => 'meta_key', 'val' => 'meta_value']
        ];

        foreach ($tables as $table => $cols) {
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table'");
            if (!$table_exists) continue;

            $query = $wpdb->prepare("SELECT * FROM $table WHERE {$cols['val']} = %s OR {$cols['val']} LIKE %s", $search_id, '%' . $search_id . '%');
            $results = $wpdb->get_results($query);
            if ($results) {
                $found[$table] = $results;
                
                // Si encontramos un customer_id, vamos a por sus detalles
                if ($table === "{$wpdb->prefix}edd_customermeta" || $table === "{$wpdb->prefix}edd_customers") {
                    $c_id = $results[0]->{$cols['id']};
                    $found['customer_details'] = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}edd_customers WHERE id = %d", $c_id));
                }
            }
        }
        
        $diag = [
            'exported_at' => current_time('mysql'),
            'search_id' => $search_id,
            'results' => $found,
        ];
        
        $json = json_encode($diag, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-customer-hunt-v12-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
}
new EDD_Data_Exporter_V12();
